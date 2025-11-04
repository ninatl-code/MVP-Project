import { useState, useEffect } from 'react';
import { Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * CameraSplash - Composant d'animation de caméra style Airbnb
 * 
 * @param {boolean} isVisible - Contrôle l'affichage de l'animation
 * @param {function} onComplete - Callback appelé après la fin de l'animation
 * @param {number} duration - Durée totale de l'animation en ms (défaut: 2000)
 * @param {string} message - Message optionnel à afficher
 * 
 * @example
 * const [showSplash, setShowSplash] = useState(false);
 * 
 * const handleClick = () => {
 *   setShowSplash(true);
 * };
 * 
 * <CameraSplash 
 *   isVisible={showSplash}
 *   onComplete={() => {
 *     setShowSplash(false);
 *     router.push('/destination');
 *   }}
 *   duration={2000}
 *   message="Chargement..."
 * />
 */
export default function CameraSplash({ 
  isVisible = false, 
  onComplete = () => {}, 
  duration = 2000,
  message = "Un instant..."
}) {
  const [flashCount, setFlashCount] = useState(0);
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    if (!isVisible) return;

    // Afficher le message après un court délai
    const messageTimer = setTimeout(() => {
      setShowMessage(true);
    }, 400);

    // Flash de la caméra (3 fois)
    const flashInterval = setInterval(() => {
      setFlashCount(prev => {
        if (prev >= 2) {
          clearInterval(flashInterval);
          return prev;
        }
        return prev + 1;
      });
    }, duration / 4);

    // Callback de fin d'animation
    const completeTimer = setTimeout(() => {
      onComplete();
      setFlashCount(0);
      setShowMessage(false);
    }, duration);

    return () => {
      clearTimeout(messageTimer);
      clearTimeout(completeTimer);
      clearInterval(flashInterval);
    };
  }, [isVisible, duration, onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#F8F9FB', // --background
            backdropFilter: 'blur(10px)'
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Animation de chargement"
        >
          {/* Flash blanc pour effet de prise de photo */}
          <AnimatePresence>
            {flashCount > 0 && (
              <motion.div
                key={flashCount}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'white',
                  pointerEvents: 'none'
                }}
              />
            )}
          </AnimatePresence>

          {/* Conteneur de la caméra */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ 
              scale: [0.5, 1.1, 1],
              opacity: 1,
              rotate: [0, -5, 5, -5, 0]
            }}
            transition={{ 
              duration: 0.6,
              times: [0, 0.5, 1],
              rotate: {
                duration: 0.8,
                repeat: Infinity,
                repeatDelay: 0.5
              }
            }}
            style={{
              position: 'relative',
              marginBottom: '32px'
            }}
          >
            {/* Cercle de fond avec gradient */}
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.2, 0.3, 0.2]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '200px',
                height: '200px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #E8EAF6, #5C6BC0)', // primary to secondary
                filter: 'blur(30px)'
              }}
            />

            {/* Icône caméra */}
            <motion.div
              animate={{ 
                y: [0, -10, 0],
              }}
              transition={{ 
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              style={{
                position: 'relative',
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #130183, #5C6BC0)', // accent to secondary
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 20px 60px rgba(19, 1, 131, 0.3)',
              }}
            >
              <Camera 
                style={{ 
                  width: '56px', 
                  height: '56px', 
                  color: 'white',
                  strokeWidth: 2
                }} 
              />
            </motion.div>

            {/* Particules qui tournent autour */}
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  rotate: 360,
                  scale: [1, 1.5, 1]
                }}
                transition={{
                  rotate: {
                    duration: 4,
                    repeat: Infinity,
                    ease: "linear",
                    delay: i * 0.1
                  },
                  scale: {
                    duration: 1,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: i * 0.1
                  }
                }}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: i % 2 === 0 ? '#E8EAF6' : '#5C6BC0',
                  transform: `translate(-50%, -50%) translateY(-80px)`,
                  transformOrigin: '6px 80px',
                  opacity: 0.6,
                  boxShadow: '0 4px 12px rgba(92, 107, 192, 0.3)'
                }}
              />
            ))}
          </motion.div>

          {/* Message de chargement */}
          <AnimatePresence>
            {showMessage && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                style={{
                  textAlign: 'center'
                }}
              >
                <motion.h2
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ 
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  style={{
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: '#1C1C1E', // --text
                    marginBottom: '8px'
                  }}
                >
                  {message}
                </motion.h2>
                
                {/* Dots animés */}
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                  {[...Array(3)].map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{
                        scale: [1, 1.5, 1],
                        opacity: [0.3, 1, 0.3]
                      }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        delay: i * 0.2
                      }}
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#130183' // --accent
                      }}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Effet de vignette */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'radial-gradient(circle, transparent 30%, rgba(28, 28, 30, 0.1) 100%)',
              pointerEvents: 'none'
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Hook personnalisé pour gérer facilement la navigation avec splash
 * 
 * @param {object} router - Instance du router Next.js
 * @param {number} duration - Durée de l'animation (défaut: 2000ms)
 * 
 * @example
 * import { useRouter } from 'next/router';
 * import { useCameraSplashNavigation } from '../components/CameraSplash';
 * 
 * const router = useRouter();
 * const { navigateWithSplash, CameraSplashComponent } = useCameraSplashNavigation(router);
 * 
 * return (
 *   <>
 *     <button onClick={() => navigateWithSplash('/destination', 'Chargement...')}>
 *       Aller quelque part
 *     </button>
 *     {CameraSplashComponent}
 *   </>
 * );
 */
export function useCameraSplashNavigation(router, duration = 2000) {
  const [splashState, setSplashState] = useState({
    isVisible: false,
    message: 'Un instant...',
    destination: null
  });

  const navigateWithSplash = (destination, message = 'Un instant...') => {
    setSplashState({
      isVisible: true,
      message,
      destination
    });
  };

  const handleComplete = () => {
    if (splashState.destination) {
      router.push(splashState.destination);
    }
    setSplashState({
      isVisible: false,
      message: 'Un instant...',
      destination: null
    });
  };

  const CameraSplashComponent = (
    <CameraSplash
      isVisible={splashState.isVisible}
      onComplete={handleComplete}
      duration={duration}
      message={splashState.message}
    />
  );

  return { navigateWithSplash, CameraSplashComponent };
}
