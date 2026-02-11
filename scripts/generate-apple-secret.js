const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");

/**
 * 💡 COMMENT UTILISER CE SCRIPT :
 *
 * 1. Téléchargez votre fichier .p8 depuis Apple Developer Portal (Keys).
 * 2. Placez-le dans ce dossier (scripts/).
 * 3. Remplissez les variables ci-dessous.
 * 4. Lancez la commande suivante dans votre terminal :
 *    npx jsonwebtoken scripts/generate-apple-secret.js (ou installez jsonwebtoken via npm)
 *
 * Note : Comme ce script nécessite 'jsonwebtoken', lancez d'abord :
 * npm install jsonwebtoken
 */

// --- CONFIGURATION À REMPLIR ---
const TEAM_ID = ""; // ex: 4P3XXXXXXX
const KEY_ID = ""; // ex: ABC123DEFG
const CLIENT_ID = "com..tita";
const P8_FILE_NAME = ".p8"; // Le nom exact de votre fichier .p8
// -------------------------------

try {
  const p8Path = path.join(__dirname, P8_FILE_NAME);

  if (!fs.existsSync(p8Path)) {
    console.error(
      `\n❌ Erreur : Le fichier ${P8_FILE_NAME} est introuvable dans le dossier scripts/`,
    );
    console.log(
      `Veuillez placer votre fichier .p8 dans : ${path.dirname(p8Path)}\n`,
    );
    process.exit(1);
  }

  const privateKey = fs.readFileSync(p8Path);

  const token = jwt.sign({}, privateKey, {
    algorithm: "ES256",
    expiresIn: "180d", // Valide 6 mois maximum
    audience: "https://appleid.apple.com",
    issuer: TEAM_ID,
    subject: CLIENT_ID,
    keyid: KEY_ID,
  });

  console.log("\n✅ Secret Key généré avec succès !");
  console.log("--------------------------------------------------");
  console.log(token);
  console.log("--------------------------------------------------");
  console.log(
    "\nCopiez ce code ci-dessus et collez-le dans le champ 'Secret Key' de Supabase.\n",
  );
} catch (error) {
  console.error("\n❌ Une erreur est survenue lors de la génération :");
  console.error(error.message);
}
