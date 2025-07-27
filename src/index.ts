import 'dotenv/config';
import SenscritiqueExtractor from './extractors/senscritique-extractor';

async function main() {
  console.log('🎬 Senscritique Movie Extractor');
  console.log('===============================');
  
  const profileUrl = process.env.SENSCRITIQUE_PROFILE_URL;
  if (!profileUrl) {
    console.error('❌ SENSCRITIQUE_PROFILE_URL not set in environment variables');
    console.log('   Please copy env.template to .env and set your profile URL');
    return;
  }
  
  console.log('🚀 Starting movie extraction...');
  const extractor = new SenscritiqueExtractor(profileUrl);
  
  try {
    const movies = await extractor.extractAllMovies();
    
    console.log(`\n🎉 Extraction Complete!`);
    console.log(`📊 Total movies extracted: ${movies.length}`);
    
    if (movies.length > 0) {
      // Export to Letterboxd-compatible CSV
      await extractor.exportToCSV();
      
      // Show top movies
      console.log('\n🏆 Your Top 10 Rated Movies:');
      movies
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 10)
        .forEach((movie, i) => {
          const letterboxdRating = convertToLetterboxdRating(movie.rating);
          console.log(`  ${i + 1}. ${movie.title} (${movie.year}) - ${movie.rating}/10 → ${letterboxdRating}/5 ⭐`);
        });
      
      console.log('\n📁 Files created:');
      console.log('  - letterboxd-import.csv (ready for Letterboxd manual import)');
      console.log('\n🎯 Next steps:');
      console.log('  1. Go to https://letterboxd.com/import/');
      console.log('  2. Upload letterboxd-import.csv');
      console.log('  3. Review and confirm the import');
    }
    
  } catch (error) {
    console.error('❌ Extraction failed:', error);
    process.exit(1);
  }
}

function convertToLetterboxdRating(rating: number): number {
  if (rating <= 0) return 0;
  const letterboxdRating = (rating / 10) * 5;
  return Math.round(letterboxdRating * 2) / 2;
}

if (require.main === module) {
  main().catch(console.error);
} 