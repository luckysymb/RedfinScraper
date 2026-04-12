# RedfinScraper

A Node.js web scraper for collecting real estate data from Redfin.com. This tool scrapes property listings including for-sale, pending, and recently sold homes across various US states.

## Features

- **Multi-State Scraping**: Supports scraping listings from multiple US states with configurable state lists.
- **Multiple Listing Types**: Handles for-sale, pending, and sold listings (last week).
- **Data Extraction**: Extracts comprehensive property details including:
  - Address (street, city, state, zip)
  - Price and currency
  - Property type (Single Family, Townhouse, Condo, etc.)
  - Bedrooms, bathrooms, square footage
  - Geographic coordinates (latitude/longitude)
  - Listing URLs and IDs
- **Schema.org Parsing**: Utilizes structured data (JSON-LD) from Redfin pages for accurate data extraction.
- **Pagination Handling**: Automatically detects and scrapes all available pages for each state.
- **Database Integration**: Supports MongoDB storage via Mongoose.
- **Stealth Scraping**: Uses Puppeteer with stealth plugins to avoid detection.

## Installation

1. Ensure you have Node.js v22.8.0 or later installed.
2. Clone or download this repository.
3. Navigate to the project directory:
   ```bash
   cd RedfinScraper
   ```
4. Install dependencies:
   ```bash
   npm install
   ```

## Usage

### Prerequisites

- Node.js v22.8.0+
- MongoDB (if using database storage)
- Internet connection for scraping

### Running Scrapers

#### For-Sale Listings
```bash
node ScrapeForsaleRedfin.js
```

#### Pending Listings
```bash
node ScrapePendingRedfin.js
```

#### Recently Sold Listings (Last Week)
```bash
node ScrapeSold1wkRedfin.js
```

### Configuration

- **State Selection**: Edit the `states` array in each scraper file to enable/disable specific states.
- **Environment Variables**: Create a `.env` file for any required configuration (e.g., database connection strings).
- **Output**: Scraped data is saved to JSON files in the `dataset/` directory or directly to MongoDB.

### Parsing Saved HTML

To parse a previously saved Redfin HTML response:
```bash
node parse.js
```

## Dependencies

- `axios`: HTTP client for API requests
- `cheerio`: jQuery-like library for HTML parsing
- `puppeteer`: Headless browser automation
- `puppeteer-extra` & `puppeteer-extra-plugin-stealth`: Enhanced Puppeteer with anti-detection capabilities
- `mongoose`: MongoDB object modeling
- `dotenv`: Environment variable management

## Project Structure

```
RedfinScraper/
├── package.json          # Project metadata and dependencies
├── ScrapeForsaleRedfin.js    # For-sale listings scraper
├── ScrapePendingRedfin.js    # Pending listings scraper
├── ScrapeSold1wkRedfin.js    # Recently sold listings scraper
├── parse.js              # HTML parsing utility
├── dataset/              # Output directory for scraped data
└── README.md             # This file
```

## Legal Disclaimer

This scraper is for educational and research purposes only. Always respect Redfin's Terms of Service and robots.txt. Web scraping may violate website terms and could be illegal in some jurisdictions. Use responsibly and at your own risk.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues or questions, please open an issue on the GitHub repository.