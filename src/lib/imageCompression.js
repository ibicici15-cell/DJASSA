import imageCompression from "browser-image-compression";

// Compresse et redimensionne les photos avant l'envoi : accélère l'upload
// (important sur connexion mobile moyenne) et réduit l'espace de stockage
// utilisé sur le serveur, sans perte visible pour une annonce.
export async function compressPhotos(files) {
  const options = {
    maxSizeMB: 0.8,
    maxWidthOrHeight: 1600,
    useWebWorker: true,
    fileType: "image/jpeg",
  };
  const compressed = [];
  for (const file of files) {
    try {
      const result = await imageCompression(file, options);
      // Garde le nom d'origine (browser-image-compression peut renommer l'extension).
      compressed.push(new File([result], file.name, { type: result.type }));
    } catch {
      compressed.push(file); // en cas d'échec, on envoie la photo telle quelle plutôt que de bloquer
    }
  }
  return compressed;
}
