import fs from 'fs';

async function update() {
  const content = fs.readFileSync('src/data/countries.ts', 'utf8');
  
  const res = await fetch('https://restcountries.com/v3.1/all?fields=name,capital');
  const data = await res.json();
  const capitalMap: Record<string, string> = {};
  if (Array.isArray(data)) {
    data.forEach((c: any) => {
      if (c.name && c.name.common) {
        capitalMap[c.name.common] = c.capital ? c.capital[0] : '';
      }
    });
  } else {
    console.error("Data is not an array:", data);
  }
  
  // Manual overrides for names that might differ
  capitalMap["Cabo Verde"] = "Praia";
  capitalMap["Congo (Brazzaville)"] = "Brazzaville";
  capitalMap["DR Congo"] = "Kinshasa";
  capitalMap["Ivory Coast"] = "Yamoussoukro";
  capitalMap["Micronesia"] = "Palikir";
  capitalMap["Sao Tome and Principe"] = "São Tomé";
  capitalMap["Timor-Leste"] = "Dili";
  capitalMap["United States"] = "Washington, D.C.";
  capitalMap["United Kingdom"] = "London";
  capitalMap["Vatican City"] = "Vatican City";
  capitalMap["South Korea"] = "Seoul";
  capitalMap["North Korea"] = "Pyongyang";
  capitalMap["Russia"] = "Moscow";
  capitalMap["Syria"] = "Damascus";
  capitalMap["Venezuela"] = "Caracas";
  capitalMap["Vietnam"] = "Hanoi";
  capitalMap["Bolivia"] = "Sucre";
  capitalMap["Czech Republic"] = "Prague";
  capitalMap["Eswatini"] = "Mbabane";
  capitalMap["Palestine"] = "Jerusalem";
  
  let updatedContent = content;
  if (!updatedContent.includes('capital: string;')) {
    updatedContent = updatedContent.replace(
      /export interface CountryData \{([\s\S]*?)\}/,
      (match, p1) => `export interface CountryData {${p1}  capital: string;\n}`
    );
  }

  const lines = updatedContent.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('{ name: "')) {
      const match = lines[i].match(/name: "([^"]+)"/);
      if (match) {
        const name = match[1];
        let capital = capitalMap[name] || '';
        if (!capital) {
          // Try to find a partial match
          const found = Object.keys(capitalMap).find(k => k.includes(name) || name.includes(k));
          if (found) capital = capitalMap[found];
        }
        if (lines[i].includes('capital:')) {
          lines[i] = lines[i].replace(/capital: "[^"]*"/, `capital: "${capital}"`);
        } else {
          lines[i] = lines[i].replace(/, animals:/, `, capital: "${capital}", animals:`);
        }
      }
    }
  }
  
  fs.writeFileSync('src/data/countries.ts', lines.join('\n'));
  console.log('Updated countries.ts');
}

update().catch(console.error);
