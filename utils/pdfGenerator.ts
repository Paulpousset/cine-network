import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

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
    
    const { uri } = await Print.printToFileAsync({ html });
    
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri);
    } else {
      Alert.alert("PDF Généré", `Le fichier a été sauvegardé : ${uri}`);
    }
  } catch (e) {
    Alert.alert("Erreur", "Impossible de générer le PDF. Assurez-vous d'avoir installé expo-print et expo-sharing.");
    console.error(e);
  }
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
