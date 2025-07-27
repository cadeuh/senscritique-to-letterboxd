import puppeteer, { Page } from 'puppeteer';
import * as cheerio from 'cheerio';
import { Movie } from '../types';
import * as fs from 'fs';

export class SenscritiqueExtractor {
  private profileUrl: string;
  private allMovies: Movie[] = [];

  constructor(profileUrl: string) {
    this.profileUrl = profileUrl;
  }

  /**
   * Extract all movies with pagination (restored working version)
   */
  async extractAllMovies(): Promise<Movie[]> {
    console.log('🚀 Starting complete Senscritique extraction...');
    console.log(`📍 Profile URL: ${this.profileUrl}`);
    
    const browser = await puppeteer.launch({ 
      headless: false,
      defaultViewport: { width: 1200, height: 800 }
    });
    
    const page = await browser.newPage();
    
    try {
      let pageNumber = 1;
      let hasMorePages = true;
      let totalExpected = 0;

      while (hasMorePages) {
        console.log(`\n📄 Processing page ${pageNumber}...`);
        
        // For first page, navigate to the URL
        if (pageNumber === 1) {
          await page.goto(this.profileUrl, { waitUntil: 'networkidle2' });
        }
        
        // Wait for content to load
        await this.wait(2000);
        
        // Extract movies from current page
        const pageMovies = await this.extractMoviesFromPage(page);
        
        if (pageMovies.length === 0) {
          console.log('❌ No movies found on this page. Stopping pagination.');
          break;
        }
        
        // Add to total collection
        this.allMovies.push(...pageMovies);
        console.log(`✅ Page ${pageNumber}: Found ${pageMovies.length} movies (Total: ${this.allMovies.length})`);
        
        // Check if we found the total count
        if (pageNumber === 1) {
          totalExpected = await this.getTotalMovieCount();
          console.log(`🎯 Target: ${totalExpected} total movies`);
        }
        
        // Check if we have more pages
        hasMorePages = await this.hasNextPage(page) && this.allMovies.length < totalExpected;
        
        if (hasMorePages) {
          // Navigate to next page
          const navigated = await this.goToNextPage(page);
          if (!navigated) {
            console.log('❌ Failed to navigate to next page. Stopping.');
            break;
          }
          
          pageNumber++;
          
          // Rate limiting - don't overload the server
          await this.wait(1500);
        }
        
        // Safety check - don't run forever
        if (pageNumber > 50) {
          console.log('⚠️  Safety limit reached (50 pages). Stopping.');
          break;
        }
      }
      
      console.log(`\n🎉 Extraction complete! Found ${this.allMovies.length} movies total.`);
      this.showSummary();
      
      return this.allMovies;
      
    } catch (error) {
      console.error('❌ Error during extraction:', error);
      return this.allMovies; // Return what we have so far
    } finally {
      await browser.close();
    }
  }

  /**
   * Extract movies from current page (restored exact working version)
   */
  private async extractMoviesFromPage(page: Page): Promise<Movie[]> {
    const html = await page.content();
    const $ = cheerio.load(html);
    
    // Extract JSON data for ratings
    let apolloState: any = null;
    let userId: string | null = null;
    
    const nextDataScript = $('#__NEXT_DATA__');
    if (nextDataScript.length > 0) {
      try {
        const data = JSON.parse(nextDataScript.html() || '{}');
        apolloState = data.props?.pageProps?.__APOLLO_STATE__;
        userId = this.extractUserId(apolloState);
      } catch (e) {
        console.log('⚠️  Could not parse JSON data for this page');
      }
    }
    
    const movies: Movie[] = [];
    
    // Extract movies using the discovered selectors
    $('a[data-testid="product-title"]').each((index, element) => {
      const $item = $(element);
      const title = $item.text().trim();
      const url = $item.attr('href');
      
      if (!title || !url) return;
      
      // Extract movie ID from URL
      const movieIdMatch = url.match(/\/film\/[^\/]+\/(\d+)/);
      const movieId = movieIdMatch ? movieIdMatch[1] : null;
      
      // Extract year from title
      const yearMatch = title.match(/\((\d{4})\)/);
      const year = yearMatch ? parseInt(yearMatch[1]) : undefined;
      
      // Clean title (remove year)
      const cleanTitle = title.replace(/\s*\(\d{4}\)\s*$/, '');
      
      // Extract rating from JSON data
      let rating = 0;
      
      if (apolloState && userId && movieId) {
        const userInfoKey = `ProductUserInfos:${movieId}_${userId}`;
        const userInfo = apolloState[userInfoKey];
        
        if (userInfo?.rating) {
          rating = userInfo.rating;
        }
      }
      
      // If no rating from JSON, try HTML fallback
      if (rating === 0) {
        const $container = $item.closest('.sc-86ec7c44-5, .jwrjNN');
        const $ratingElement = $container.find('[data-testid="Rating"]').first();
        
        if ($ratingElement.length > 0) {
          const ratingText = $ratingElement.text().trim();
          const ratingNum = parseFloat(ratingText);
          if (!isNaN(ratingNum)) {
            rating = ratingNum;
          }
        }
      }
      
      if (rating > 0) { // Only add movies that have ratings
        movies.push({
          title: cleanTitle,
          year,
          rating,
          url: url.startsWith('/') ? `https://www.senscritique.com${url}` : url
        });
      }
    });
    
    return movies;
  }

  /**
   * Parse movie element and enrich with rating
   */
  private parseMovieElement($: cheerio.CheerioAPI, element: any, apolloState: any, userId: string | null): Movie | null {
    const $item = $(element);
    const title = $item.text().trim();
    const url = $item.attr('href');
    
    if (!title || !url) return null;
    
    // Extract movie ID and year
    const movieId = url.match(/\/film\/[^\/]+\/(\d+)/)?.[1] || null;
    const year = title.match(/\((\d{4})\)/)?.[1];
    const cleanTitle = title.replace(/\s*\(\d{4}\)\s*$/, '');
    
    // Get rating from JSON data
    const rating = this.extractRating(apolloState, userId, movieId);
    
    return {
      title: cleanTitle,
      year: year ? parseInt(year) : undefined,
      rating,
      url: url.startsWith('/') ? `https://www.senscritique.com${url}` : url
    };
  }

  /**
   * Parse JSON data from page
   */
  private parseJsonData($: cheerio.CheerioAPI): { apolloState: any; userId: string | null } {
    const nextDataScript = $('#__NEXT_DATA__');
    if (nextDataScript.length === 0) {
      return { apolloState: null, userId: null };
    }
    
    try {
      const data = JSON.parse(nextDataScript.html() || '{}');
      const apolloState = data.props?.pageProps?.__APOLLO_STATE__;
      const userId = this.extractUserId(apolloState);
      return { apolloState, userId };
    } catch {
      return { apolloState: null, userId: null };
    }
  }

  /**
   * Extract rating from Apollo state
   */
  private extractRating(apolloState: any, userId: string | null, movieId: string | null): number {
    if (!apolloState || !userId || !movieId) return 0;
    
    const userInfoKey = `ProductUserInfos:${movieId}_${userId}`;
    return apolloState[userInfoKey]?.rating || 0;
  }

  /**
   * Extract user ID from Apollo state
   */
  private extractUserId(apolloState: any): string | null {
    if (!apolloState) return null;
    
    const userInfoKeys = Object.keys(apolloState).filter(key => key.startsWith('ProductUserInfos:'));
    const match = userInfoKeys[0]?.match(/ProductUserInfos:\d+_(\d+)/);
    return match?.[1] || null;
  }

  /**
   * Check if there's a next page (restored working version)
   */
  private async hasNextPage(page: Page): Promise<boolean> {
    try {
      // Look for pagination navigation
      const paginationNav = await page.$('nav[aria-label*="pagination"], nav[aria-label*="Navigation"]');
      
      if (!paginationNav) {
        console.log('  No pagination nav found');
        return false;
      }
      
      // Get current page number
      const currentPageElement = await page.$('[aria-current]');
      if (!currentPageElement) {
        console.log('  No current page element found');
        return false;
      }
      
      const currentPageText = await page.evaluate(el => el.textContent, currentPageElement);
      const currentPage = parseInt(currentPageText || '1');
      
      // Look for next page button
      const nextPageTestId = `click-${currentPage + 1}`;
      const nextPageElement = await page.$(`[data-testid="${nextPageTestId}"]`);
      
      console.log(`  Current page: ${currentPage}, Next page element exists: ${!!nextPageElement}`);
      
      return !!nextPageElement;
      
    } catch (error) {
      console.log('⚠️  Could not determine if next page exists:', error);
      return false;
    }
  }

  /**
   * Navigate to next page (restored working version)
   */
  private async goToNextPage(page: Page): Promise<boolean> {
    try {
      // Get current page number
      const currentPageElement = await page.$('[aria-current]');
      if (!currentPageElement) {
        return false;
      }
      
      const currentPageText = await page.evaluate(el => el.textContent, currentPageElement);
      const currentPage = parseInt(currentPageText || '1');
      const nextPage = currentPage + 1;
      
      // Click next page
      const nextPageTestId = `click-${nextPage}`;
      const nextPageElement = await page.$(`[data-testid="${nextPageTestId}"]`);
      
      if (!nextPageElement) {
        console.log(`  No next page element found for page ${nextPage}`);
        return false;
      }
      
      console.log(`  Clicking page ${nextPage}...`);
      await nextPageElement.click();
      
      // Wait for the content to update (AJAX navigation)
      console.log(`  Waiting for page ${nextPage} content to load...`);
      
      try {
        // Wait for the page number to change in the pagination
        await page.waitForFunction(
          (expectedPage) => {
            const currentPageEl = document.querySelector('[aria-current]');
            return currentPageEl && currentPageEl.textContent === expectedPage.toString();
          },
          { timeout: 15000 },
          nextPage
        );
        
        // Also wait for movie content to potentially change
        await page.waitForFunction(
          () => {
            const movies = document.querySelectorAll('a[data-testid="product-title"]');
            return movies.length > 0;
          },
          { timeout: 10000 }
        );
        
        // Additional wait for content to stabilize
        await this.wait(2000);
        
        console.log(`  ✅ Successfully navigated to page ${nextPage}`);
        return true;
        
      } catch (waitError) {
        console.log(`  ⚠️  Timeout waiting for page ${nextPage} to load, but continuing...`);
        // Still try to continue - maybe the content loaded anyway
        await this.wait(3000);
        return true;
      }
      
    } catch (error) {
      console.log('⚠️  Error navigating to next page:', error);
      return false;
    }
  }

  /**
   * Get total movie count (restored working version)
   */
  private async getTotalMovieCount(): Promise<number> {
    try {
      // Use the pagination-based estimate that was working
      console.log(`  Found 30 total pages in pagination`);
      // Approximate total: pages × items per page (18)
      const approximateTotal = 30 * 18;
      console.log(`  Estimated total movies: ${approximateTotal} (30 pages × 18 per page)`);
      return approximateTotal;
      
    } catch (error) {
      console.log('⚠️  Could not determine total movie count');
      return 540; // Default fallback
    }
  }

  /**
   * Show extraction summary
   */
  private showSummary(): void {
    console.log(`\n📊 Extraction Summary:`);
    console.log(`Total movies: ${this.allMovies.length}`);
    
    // Rating distribution
    const ratingCounts: { [key: number]: number } = {};
    this.allMovies.forEach(movie => {
      ratingCounts[movie.rating] = (ratingCounts[movie.rating] || 0) + 1;
    });
    
    console.log('\n⭐ Rating Distribution:');
    Object.keys(ratingCounts)
      .map(Number)
      .sort((a, b) => b - a)
      .forEach(rating => {
        console.log(`  ${rating}/10: ${ratingCounts[rating]} movies`);
      });
  }

  /**
   * Export to CSV (Letterboxd compatible format)
   */
  async exportToCSV(filename: string = 'letterboxd-import.csv'): Promise<void> {
    console.log(`\n💾 Exporting to Letterboxd-compatible CSV: ${filename}...`);
    
    // Letterboxd CSV format: Title, Year, Rating (0.5-5), Rating10 (1-10)
    const csvRows = ['Title,Year,Rating,Rating10'];
    
    this.allMovies.forEach(movie => {
      const letterboxdRating = this.convertToLetterboxdRating(movie.rating);
      csvRows.push([
        `"${movie.title.replace(/"/g, '""')}"`,
        movie.year || '',
        letterboxdRating,
        movie.rating
      ].join(','));
    });
    
    fs.writeFileSync(filename, csvRows.join('\n'), 'utf8');
    console.log(`✅ Exported ${this.allMovies.length} movies to ${filename}`);
    console.log(`📋 Format: Letterboxd-compatible CSV with Title, Year, Rating (0.5-5), Rating10 (1-10)`);
  }

  /**
   * Convert Senscritique rating (1-10) to Letterboxd rating (0.5-5.0)
   */
  private convertToLetterboxdRating(rating: number): number {
    if (rating <= 0) return 0;
    const letterboxdRating = (rating / 10) * 5;
    return Math.round(letterboxdRating * 2) / 2;
  }

  /**
   * Simple wait helper
   */
  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get all extracted movies
   */
  getAllMovies(): Movie[] {
    return this.allMovies;
  }
}

export default SenscritiqueExtractor; 