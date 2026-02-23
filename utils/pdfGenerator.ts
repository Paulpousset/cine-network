import { getWeatherCodeInfo } from '@/services/WeatherService';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';

/**
 * Generates a PDF contract for an actor/technician.
 */
export async function generateContract(
  type: 'image_rights' | 'volunteer',
  project: any,
  user: any,
  role: any
) {
  try {
    const html = generateHtml(type, project, user, role);
    
    if (Platform.OS === 'web') {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.onload = () => {
          printWindow.focus();
          printWindow.print();
        };
      } else {
        await Print.printAsync({ html });
      }
    } else {
      const { uri } = await Print.printToFileAsync({ html });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      } else {
        Alert.alert("PDF Généré", `Le fichier a été sauvegardé : ${uri}`);
      }
    }
  } catch (e) {
    Alert.alert("Erreur", "Impossible de générer le PDF. Assurez-vous d'avoir installé expo-print et expo-sharing.");
    console.error(e);
  }
}

export async function generateCallSheet(
  project: any,
  day: any,
  calls: any[],
  linkedScenes: any[],
  projectSets: any[],
  dayWeather: any
) {
  try {
    const html = generateCallSheetHtml(project, day, calls, linkedScenes, projectSets, dayWeather);
    
    if (Platform.OS === 'web') {
      // Robust web print by opening a new window with only the HTML
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
        
        // Let scripts/styles settle (even if they are inline)
        printWindow.onload = () => {
          printWindow.focus();
          printWindow.print();
        };
      } else {
        // Fallback if popup blocked
        await Print.printAsync({ html });
      }
    } else {
      const { uri } = await Print.printToFileAsync({ html });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Feuille de Service - ${day.date}`,
          UTI: 'com.adobe.pdf'
        });
      } else {
        Alert.alert("PDF Généré", `Le fichier a été sauvegardé : ${uri}`);
      }
    }
  } catch (e) {
    Alert.alert("Erreur", "Impossible de générer le PDF.");
    console.error(e);
  }
}

function generateCallSheetHtml(
  project: any,
  day: any,
  calls: any[],
  linkedScenes: any[],
  projectSets: any[],
  dayWeather: any
) {
  const dateStr = new Date(day.date).toLocaleDateString('fr-FR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const locations: { name: string; address: string }[] = [];

  // 1. Add main day location
  if (day.location || day.address_street || day.address_city) {
    const addr = [day.address_street, day.address_city].filter(Boolean).join(', ');
    locations.push({
      name: day.location || "Lieu principal",
      address: addr
    });
  }

  // 2. Add locations from scenes/sets
  linkedScenes.forEach(ls => {
    const scene = ls.scene;
    if (!scene?.slugline) return;
    const slug = scene.slugline.toLowerCase().trim();
    const matchingSet = (projectSets || []).find(s => {
      const setName = s.name?.toLowerCase().trim();
      return setName && (slug === setName || slug.includes(setName));
    });

    if (matchingSet && matchingSet.address) {
      const alreadyExists = locations.some(l => 
        l.address?.toLowerCase().trim() === matchingSet.address?.toLowerCase().trim() ||
        l.name?.toLowerCase().trim() === matchingSet.name?.toLowerCase().trim()
      );
      if (!alreadyExists) {
        locations.push({
          name: matchingSet.name,
          address: matchingSet.address
        });
      }
    }
  });

  const locationsListHtml = locations.length > 0 
    ? locations.map(loc => `
        <div style="margin-bottom: 8px;">
          <p style="margin: 0; font-size: 14px; line-height: 1.2;"><strong>${loc.name}</strong></p>
          <p style="margin: 0; font-size: 12px; color: #444; line-height: 1.2;">${loc.address || 'Adresse non renseignée'}</p>
        </div>
      `).join('')
    : '<p>Aucun lieu renseigné</p>';

  const callsHtml = calls.map(call => `
    <tr>
      <td style="border: 1px solid #ddd; padding: 8px;">${call.role?.title || "Inconnu"}</td>
      <td style="border: 1px solid #ddd; padding: 8px;">${call.role?.assigned_profile?.full_name || "Vacant"}</td>
      <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${call.call_time || day.call_time || "--:--"}</td>
    </tr>
  `).join('');

  const scenesHtml = [...linkedScenes].sort((a, b) => (a.order_index || 0) - (b.order_index || 0)).map(ls => `
    <tr>
      <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${ls.scene?.scene_number || "-"}</td>
      <td style="border: 1px solid #ddd; padding: 8px;">${ls.scene?.slugline || "Sans titre"}</td>
      <td style="border: 1px solid #ddd; padding: 8px;">${ls.scene?.int_ext || ""} ${ls.scene?.day_night || ""}</td>
      <td style="border: 1px solid #ddd; padding: 8px;">${ls.scene?.description || ""}</td>
    </tr>
  `).join('');

  return `
    <html>
      <head>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; line-height: 1.5; padding: 20px; }
          .header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
          .project-title { font-size: 28px; font-weight: bold; margin: 0; text-transform: uppercase; }
          .sheet-title { font-size: 18px; margin: 0; color: #666; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
          .info-card { border: 1px solid #ddd; padding: 15px; border-radius: 4px; }
          .info-card h3 { margin-top: 0; font-size: 14px; color: #888; text-transform: uppercase; border-bottom: 1px solid #eee; padding-bottom: 5px; }
          .time { font-size: 24px; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background-color: #f5f5f5; text-align: left; border: 1px solid #ddd; padding: 8px; font-size: 14px; text-transform: uppercase; }
          .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 12px; margin-right: 5px; background: #eee; }
          .risk { background: #ffe3e3; color: #c92a2a; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="project-title">${project.title || 'Projet Cinéma'}</h1>
            <p class="sheet-title">FEUILLE DE SERVICE - ${dateStr}</p>
          </div>
          <div style="text-align: right">
            <p><strong>Heure de début :</strong> ${day.call_time || '--:--'}</p>
            <p><strong>Fin estimée :</strong> ${day.wrap_time || '--:--'}</p>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-card">
            <h3>Lieux & Accès</h3>
            ${locationsListHtml}
            ${day.parking_info ? `<p style="margin-top: 10px;"><strong>Parking :</strong> ${day.parking_info}</p>` : ''}
            ${day.base_camp_location ? `<p><strong>Base Régie :</strong> ${day.base_camp_location}</p>` : ''}
            <div style="margin-top: 10px;">
              ${(day.access_constraints || []).map((t: any) => `<span class="badge">${t}</span>`).join('')}
            </div>
          </div>
          <div class="info-card">
            <h3>Météo & Sécurité</h3>
            <p><strong>Météo :</strong> ${dayWeather ? `${Math.round(dayWeather.temperature_2m)}°C - ${getWeatherCodeInfo(dayWeather.weathercode).label}` : (day.weather_summary || 'N/A')}</p>
            <div>
              ${(day.risks || []).map((t: any) => `<span class="badge risk">${t}</span>`).join('')}
            </div>
            <p><strong>Pause Déjeuner :</strong> ${day.lunch_time || '--:--'}</p>
            <p style="font-size: 12px; color: #666;">${day.catering_info || ''}</p>
          </div>
        </div>

        <h3>Convocations</h3>
        <table>
          <thead>
            <tr>
              <th>Poste / Rôle</th>
              <th>Nom</th>
              <th style="text-align: center;">Heure d'arrivée</th>
            </tr>
          </thead>
          <tbody>
            ${callsHtml}
          </tbody>
        </table>

        <h3 style="margin-top: 30px;">Séquences du jour</h3>
        <table>
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">N°</th>
              <th style="width: 150px;">Lieu (Scénario)</th>
              <th style="width: 80px;">Effet</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            ${scenesHtml}
          </tbody>
        </table>

        ${day.notes ? `<div style="margin-top: 20px; padding: 10px; background: #fff9db; border: 1px solid #fab005; border-radius: 4px;">
          <strong>Notes :</strong> ${day.notes}
        </div>` : ''}

        <div style="margin-top: 40px; font-size: 10px; color: #999; text-align: center;">
          Généré via CineNetwork - ${new Date().toLocaleString()}
        </div>
      </body>
    </html>
  `;
}

function generateHtml(type: string, project: any, user: any, role: any) {
  const date = new Date().toLocaleDateString();
  
  const commonHeader = `
    <div style="font-family: Helvetica, Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto;">
      <h1 style="text-align: center; color: #333;">${type === 'image_rights' ? 'AUTORISATION DE DROIT À L\'IMAGE' : 'CONTRAT DE BÉNÉVOLAT'}</h1>
      <p style="text-align: right; margin-top: 20px;">Fait à ${project.ville || '_______'}, le ${date}</p>
      
      <div style="margin-top: 40px; border: 1px solid #ccc; padding: 20px; background-color: #f9f9f9;">
        <h3 style="margin-top: 0;">ENTRE LES SOUSSIGNÉS :</h3>
        <p><strong>LA PRODUCTION (Le Projet) :</strong> ${project.title}</p>
        <p>Représentée par : ${project.owner_id} (Producteur)</p>
        <p>Ci-après dénommé « Le Producteur »</p>
        
        <h3 style="margin-top: 20px;">ET :</h3>
        <p><strong>L'INTERVENANT :</strong> ${user.full_name}</p>
        <p>Demeurant à : ${user.ville || '________________'}</p>
        <p>Agissant en qualité de : ${role.title}</p>
        <p>Ci-après dénommé « L'Intervenant »</p>
      </div>
  `;

  const imageRightsBody = `
      <div style="margin-top: 30px;">
        <h3>ARTICLE 1 : OBJET</h3>
        <p>L'Intervenant autorise le Producteur à fixer, reproduire et communiquer au public son image et sa voix dans le cadre du projet "${project.title}".</p>
        
        <h3>ARTICLE 2 : EXPLOITATION</h3>
        <p>Cette autorisation est valable pour une durée de 10 ans, pour le monde entier, sur tous supports (cinéma, web, festivals, TV).</p>
        
        <h3>ARTICLE 3 : GRATUITÉ</h3>
        <p>La présente autorisation est consentie à titre gracieux.</p>
      </div>
  `;

  const volunteerBody = `
      <div style="margin-top: 30px;">
        <h3>ARTICLE 1 : MISSION</h3>
        <p>L'Intervenant accepte d'apporter son concours bénévole au projet "${project.title}" en qualité de ${role.title}.</p>
        
        <h3>ARTICLE 2 : DATES</h3>
        <p>La mission se déroulera du ${project.start_date || '___'} au ${project.end_date || '___'}.</p>
        
        <h3>ARTICLE 3 : DÉFRAIEMENTS</h3>
        <p>Le Producteur s'engage à prendre en charge les frais de repas et de transport sur présentation de justificatifs, dans la limite du budget alloué.</p>
      </div>
  `;

  const footer = `
      <div style="margin-top: 60px; display: flex; justify-content: space-between;">
        <div style="width: 45%;">
          <p><strong>Pour le Producteur</strong></p>
          <p style="font-size: 12px; color: #999;">(Signature précédée de la mention "Lu et approuvé")</p>
          <div style="height: 100px; border-bottom: 1px solid #000;"></div>
        </div>
        <div style="width: 45%;">
          <p><strong>Pour l'Intervenant</strong></p>
          <p style="font-size: 12px; color: #999;">(Signature précédée de la mention "Lu et approuvé")</p>
          <div style="height: 100px; border-bottom: 1px solid #000;"></div>
        </div>
      </div>
    </div>
  `;

  return `
    <html>
      <body>
        ${commonHeader}
        ${type === 'image_rights' ? imageRightsBody : volunteerBody}
        ${footer}
      </body>
    </html>
  `;
}
