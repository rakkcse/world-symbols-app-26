import fs from 'fs';
import { countries } from './src/data/countries.js';

async function updateCountries() {
  const updatedCountries = [];
  
  for (const country of countries) {
    try {
      const res = await fetch(`https://restcountries.com/v3.1/name/${encodeURIComponent(country.name)}?fullText=true`);
      if (!res.ok) {
        throw new Error(`Failed to fetch ${country.name}`);
      }
      const data = await res.json();
      const countryData = data[0];
      
      const capital = countryData.capital ? countryData.capital[0] : 'Unknown';
      const languages = countryData.languages ? Object.values(countryData.languages) : ['Unknown'];
      
      // Fetch short extract from Wikipedia
      const wikiRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(country.name)}`);
      let history = `A fascinating country with a rich cultural heritage and history.`;
      if (wikiRes.ok) {
        const wikiData = await wikiRes.json();
        if (wikiData.extract) {
          // Get the first sentence or two
          history = wikiData.extract.split('. ').slice(0, 2).join('. ') + '.';
        }
      }
      
      updatedCountries.push({
        ...country,
        capital,
        languages,
        history
      });
      console.log(`Updated ${country.name}`);
    } catch (err) {
      console.error(`Error updating ${country.name}:`, err.message);
      updatedCountries.push({
        ...country,
        capital: 'Unknown',
        languages: ['Unknown'],
        history: `A fascinating country with a rich cultural heritage and history.`
      });
    }
    
    // Sleep to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  const fileContent = `export interface CountryData {
  name: string;
  animals: string[];
  birds: string[];
  currencies: string[];
  flowers: string[];
  sports: string[];
  capital?: string;
  languages?: string[];
  history?: string;
}

export const countries: CountryData[] = ${JSON.stringify(updatedCountries, null, 2)};
`;

  fs.writeFileSync('./src/data/countries.ts', fileContent);
  console.log('Done!');
}

updateCountries();
