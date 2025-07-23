const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function testPhoneExtraction(query = 'plombier Lyon') {
  console.log(`🔍 Test d'extraction des numéros pour: ${query}`);
  
  const browser = await puppeteer.launch({ 
    headless: true, 
    args: ['--disable-blink-features=AutomationControlled']
  });
  
  const page = await browser.newPage();
  
  try {
    // Aller sur Google Maps
    await page.goto(`https://www.google.com/maps/search/${encodeURIComponent(query)}`, { 
      waitUntil: 'networkidle2' 
    });
    
    // Attendre le chargement
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Gérer le consentement si nécessaire
    try {
      const consentButton = await page.waitForSelector('span.UywwFc-RLmnJb', { 
        visible: true, 
        timeout: 5000 
      });
      if (consentButton) {
        await consentButton.click();
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    } catch (e) {
      console.log('Pas de dialogue de consentement');
    }
    
    // Attendre les résultats
    await page.waitForSelector('.UaQhfb.fontBodyMedium, .hfpxzc', { timeout: 15000 });
    
    console.log('\n🎯 === EXTRACTION AVEC LES NOUVEAUX SÉLECTEURS ===\n');
    
    // Extraire les données avec les sélecteurs découverts via DOM inspection
    const results = await page.evaluate(() => {
      const businesses = [];
      
      // Utiliser les sélecteurs découverts via l'inspection DOM
      const containers = document.querySelectorAll('.UaQhfb.fontBodyMedium');
      console.log(`Trouvé ${containers.length} conteneurs d'entreprises`);
      
      containers.forEach((container, index) => {
        // Extraire le nom
        let name = '';
        const nameSelectors = ['.qBF1Pd', '.fontHeadlineSmall', '.NrDZNb'];
        
        for (const selector of nameSelectors) {
          const nameEl = container.querySelector(selector) || 
                         container.parentElement?.querySelector(selector) ||
                         container.closest('[data-result-index]')?.querySelector(selector);
          if (nameEl) {
            name = nameEl.textContent.trim();
            break;
          }
        }
        
        // Extraire le téléphone avec le sélecteur découvert: span.UsdlK
        let phone = '';
        const phoneEl = container.querySelector('span.UsdlK');
        if (phoneEl) {
          const phoneText = phoneEl.textContent.trim();
          const phoneMatch = phoneText.match(/\b0[1-9](?:[\s.-]?\d{2}){4}\b/);
          if (phoneMatch) {
            phone = phoneMatch[0];
          }
        }
        
        // Si on a trouvé un nom ou un téléphone
        if (name || phone) {
          businesses.push({
            name: name || `Entreprise ${index + 1}`,
            phone: phone || 'Non trouvé',
            found_with: phoneEl ? 'span.UsdlK' : 'pas de téléphone'
          });
          
          console.log(`✅ ${index + 1}. ${name || 'Nom non trouvé'} - TEL: ${phone || 'Non trouvé'}`);
        }
      });
      
      return businesses;
    });
    
    console.log(`\n📊 === RÉSULTATS ===`);
    console.log(`🏢 Total entreprises: ${results.length}`);
    console.log(`📞 Avec téléphones: ${results.filter(b => b.phone !== 'Non trouvé').length}`);
    
    if (results.length > 0) {
      console.log(`\n📋 === DÉTAIL DES ENTREPRISES ===`);
      results.forEach((business, index) => {
        console.log(`${index + 1}. 🏢 ${business.name}`);
        console.log(`   📞 ${business.phone}`);
        console.log(`   🔍 Trouvé avec: ${business.found_with}`);
        console.log('');
      });
    } else {
      console.log('❌ Aucune entreprise trouvée');
    }
    
    // Test supplémentaire: chercher TOUS les span.UsdlK sur la page
    console.log(`\n🔍 === TEST SUPPLÉMENTAIRE: TOUS LES span.UsdlK ===`);
    const allPhones = await page.evaluate(() => {
      const phoneElements = document.querySelectorAll('span.UsdlK');
      const phones = [];
      
      phoneElements.forEach((el, index) => {
        const text = el.textContent.trim();
        if (text.match(/\b0[1-9](?:[\s.-]?\d{2}){4}\b/)) {
          phones.push(`${index + 1}. ${text}`);
        }
      });
      
      return phones;
    });
    
    if (allPhones.length > 0) {
      console.log(`✅ Trouvé ${allPhones.length} numéros de téléphone sur la page:`);
      allPhones.forEach(phone => console.log(`   📞 ${phone}`));
    } else {
      console.log('❌ Aucun span.UsdlK trouvé avec des numéros');
    }
    
    console.log(`\n✅ Test terminé ! Le navigateur reste ouvert pour inspection.`);
    
    return results;
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    return [];
  }
}

// Lancer le test
if (require.main === module) {
  const query = process.argv[2] || 'plombier Lyon';
  testPhoneExtraction(query)
    .then(results => {
      console.log(`\n🎉 Test terminé avec ${results.length} entreprises trouvées`);
    })
    .catch(console.error);
}

module.exports = { testPhoneExtraction };
