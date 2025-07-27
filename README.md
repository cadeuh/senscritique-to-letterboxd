# 🎬 Senscritique to Letterboxd

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)

Extract your movie ratings from **Senscritique** and convert them to **Letterboxd-compatible CSV format** for easy manual import.

Note: I've developed it using Claude, it worked fine for me, but might be subject to errors as I didn't test it for other accounts.

## ✨ Features

- 🎯 **Complete extraction** - Extracts all your rated movies from Senscritique
- 🔄 **Perfect conversion** - Converts 1-10 ratings to Letterboxd's 0.5-5 scale
- 📊 **CSV export** - Generates Letterboxd-compatible import files

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 18 or higher
- A Senscritique account with rated movies

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/cadeuh/senscritique-to-letterboxd.git
   cd senscritique-to-letterboxd
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure your profile**
   ```bash
   cp env.template .env
   # Edit .env with your Senscritique profile URL
   ```

### Usage

1. **Extract your movies**

   ```bash
   npm run extract
   ```

2. **Import to Letterboxd**
   - Go to [letterboxd.com/import/](https://letterboxd.com/import/)
   - Upload the generated `letterboxd-import.csv` file
   - Review matches and confirm import

## 📊 Output Format

The tool generates a CSV file with Letterboxd's expected format:

```csv
Title,Year,Rating,Rating10
"Koyaanisqatsi",1983,5,10
"Barry Lyndon",1975,4.5,9
"The Shining",1980,4,8
```

- **Title** - Movie title (properly quoted and escaped)
- **Year** - Release year
- **Rating** - Letterboxd rating (0.5-5 scale)
- **Rating10** - Original Senscritique rating (1-10 scale)

## 🛠️ Commands

```bash
npm run extract     # Extract movies from Senscritique
npm run convert     # Convert existing CSV to Letterboxd format
npm run build       # Compile TypeScript
npm run clean       # Remove build files
```

## 🔧 Utilities

### Format Converter

Convert any Senscritique CSV export to Letterboxd format:

```bash
# Use default files
npm run convert

# Custom input/output files
node scripts/convert-to-letterboxd.js input.csv output.csv
```

## 📁 Project Structure

```
├── src/
│   ├── extractors/
│   │   └── senscritique-extractor.ts    # Main extraction logic
│   ├── types/
│   │   └── index.ts                     # TypeScript definitions
│   └── index.ts                         # CLI entry point
├── scripts/
│   └── convert-to-letterboxd.js         # Conversion utility
├── examples/
│   └── sample-output.csv                # Sample output format
├── .env.template                        # Environment configuration
└── README.md
```

## ⚙️ Configuration

Copy `env.template` to `.env` and configure:

```bash
# Your Senscritique profile URL
SENSCRITIQUE_PROFILE_URL=https://www.senscritique.com/YOUR_USERNAME/collection?universe=1&action=RATING

# Optional: Run headless (default: false for debugging)
# HEADLESS=true
```

## 🎯 How it Works

1. **Web Scraping** - Uses Puppeteer to navigate your Senscritique profile
2. **Data Extraction** - Parses movie titles, years, and ratings from HTML and JSON
3. **Pagination** - Automatically handles multiple pages of results
4. **Format Conversion** - Converts ratings from 1-10 to 0.5-5 scale
5. **CSV Export** - Generates Letterboxd-compatible import file

## 📚 Letterboxd Import Guide

1. **Go to Import Page**: [letterboxd.com/import/](https://letterboxd.com/import/)
2. **Select File**: Choose your generated `letterboxd-import.csv`
3. **Review Matches**: Letterboxd will attempt to match your movies
4. **Confirm Import**: All movies will be marked as watched with ratings

### Import Notes

- ✅ **Title Matching** - Letterboxd matches by title and year
- ✅ **Automatic Watched Status** - All imported movies marked as watched
- ✅ **Rating Preservation** - Your ratings are converted and preserved
- ⚠️ **No Undo** - Review carefully before confirming
- 📏 **File Limit** - 1MB max file size (usually not an issue)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development

```bash
git clone https://github.com/username/senscritique-to-letterboxd.git
cd senscritique-to-letterboxd
npm install
npm run dev
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

This tool is for personal use only. Please respect Senscritique's terms of service and rate limiting. The authors are not responsible for any misuse or violations.
