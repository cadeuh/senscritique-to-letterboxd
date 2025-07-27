const fs = require("fs");

/**
 * Utility script to convert Senscritique CSV export to Letterboxd import format
 * Usage: node scripts/convert-to-letterboxd.js [input-file] [output-file]
 */

const inputFile = process.argv[2] || "senscritique-movies.csv";
const outputFile = process.argv[3] || "letterboxd-import.csv";

console.log("🔄 Converting Senscritique CSV to Letterboxd format...");
console.log(`📂 Input:  ${inputFile}`);
console.log(`📂 Output: ${outputFile}`);

// Check if input file exists
if (!fs.existsSync(inputFile)) {
  console.error(`❌ Error: Input file '${inputFile}' not found`);
  console.log(
    "Usage: node scripts/convert-to-letterboxd.js [input-file] [output-file]"
  );
  console.log("");
  console.log("Examples:");
  console.log("  node scripts/convert-to-letterboxd.js");
  console.log("  node scripts/convert-to-letterboxd.js my-export.csv");
  console.log("  node scripts/convert-to-letterboxd.js input.csv output.csv");
  process.exit(1);
}

try {
  // Read original CSV
  const csvContent = fs.readFileSync(inputFile, "utf8");
  const lines = csvContent.trim().split("\n");

  console.log(
    `📊 Original file: ${lines.length} total lines (${
      lines.length - 1
    } movies + header)`
  );

  // Start with Letterboxd header
  const letterboxdRows = ["Title,Year,Rating,Rating10"];

  // Process each movie line (skip header)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    try {
      // Parse CSV manually handling quotes
      const parts = [];
      let current = "";
      let inQuotes = false;

      for (const char of line) {
        if (char === '"') {
          inQuotes = !inQuotes;
          current += char;
        } else if (char === "," && !inQuotes) {
          parts.push(current);
          current = "";
        } else {
          current += char;
        }
      }
      parts.push(current);

      if (parts.length >= 5) {
        const title = parts[0].replace(/^"|"$/g, ""); // Remove quotes
        const year = parts[1] || "";
        const senscritiqueRating = parseInt(parts[2]);
        const letterboxdRating = parseFloat(parts[4]);

        if (senscritiqueRating > 0 && letterboxdRating > 0) {
          letterboxdRows.push(
            [
              `"${title.replace(/"/g, '""')}"`, // Properly escape quotes
              year,
              letterboxdRating,
              senscritiqueRating,
            ].join(",")
          );
        }
      }
    } catch (error) {
      console.log(`⚠️  Error parsing line ${i}: ${line.substring(0, 50)}...`);
    }
  }

  // Write Letterboxd CSV
  fs.writeFileSync(outputFile, letterboxdRows.join("\n"), "utf8");

  console.log(`✅ Generated ${outputFile}`);
  console.log(
    `📊 Letterboxd file: ${letterboxdRows.length} total lines (${
      letterboxdRows.length - 1
    } movies + header)`
  );
  console.log(
    `📋 Format: Title, Year, Rating (0.5-5 scale), Rating10 (1-10 scale)`
  );
  console.log(`\n🎬 Ready for manual import to Letterboxd!`);
  console.log(`   Go to: https://letterboxd.com/import/`);
} catch (error) {
  console.error(`❌ Error: ${error.message}`);
  process.exit(1);
}
