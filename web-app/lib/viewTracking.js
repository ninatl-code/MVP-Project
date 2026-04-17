// Note: the 'annonces' table has been removed from the schema.
// All view tracking functions are no-ops to preserve API compatibility.

export const incrementAnnonceView = async (annonceId) => {
  return true;
};

export const trackAnnonceView = async (annonceId, throttleMinutes = 60) => {
  return false;
};

export const useAnnonceViewTracking = (annonceId) => {
  const trackView = () => {};
  return { trackView };
};
