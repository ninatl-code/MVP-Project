import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

/**
 * CameraSplash - Composant d'animation de caméra style Airbnb
 * 
 * @param {boolean} isVisible - Contrôle l'affichage de l'animation
 * @param {function} onComplete - Callback appelé après la fin de l'animation
 * @param {number} duration - Durée totale de l'animation en ms (défaut: 2000)
 * @param {string} message - Message optionnel à afficher
 */
export default function CameraSplash({ 
  isVisible = false, 
  onComplete = () => {}, 
  duration = 2000,
  message = "Un instant..."
}) {
  const [flashCount, setFlashCount] = useState(0);
  const [showMessage, setShowMessage] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const dotsAnim = useRef([
    new Animated.Value(0.3),
    new Animated.Value(0.3),
    new Animated.Value(0.3)
  ]).current;
  const messageAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isVisible) {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.5);
      setFlashCount(0);
      setShowMessage(false);
      return;
    }

    // Fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true
    }).start();

    // Scale et rotate de la caméra
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.1,
        duration: 300,
        useNativeDriver: true
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      })
    ]).start();

    // Rotation continue
    Animated.loop(
      Animated.sequence([
        Animated.timing(rotateAnim, {
          toValue: -5,
          duration: 200,
          useNativeDriver: true
        }),
        Animated.timing(rotateAnim, {
          toValue: 5,
          duration: 400,
          useNativeDriver: true
        }),
        Animated.timing(rotateAnim, {
          toValue: -5,
          duration: 400,
          useNativeDriver: true
        }),
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true
        }),
        Animated.delay(500)
      ])
    ).start();

    // Float animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -10,
          duration: 1500,
          useNativeDriver: true
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true
        })
      ])
    ).start();

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true
        })
      ])
    ).start();

    // Message
    const messageTimer = setTimeout(() => {
      setShowMessage(true);
      Animated.timing(messageAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      }).start();

      // Dots animation
      Animated.loop(
        Animated.stagger(200, dotsAnim.map(dotAnim => 
          Animated.sequence([
            Animated.timing(dotAnim, {
              toValue: 1,
              duration: 500,
              useNativeDriver: true
            }),
            Animated.timing(dotAnim, {
              toValue: 0.3,
              duration: 500,
              useNativeDriver: true
            })
          ])
        ))
      ).start();
    }, 400);

    // Flash
    const flashInterval = setInterval(() => {
      setFlashCount(prev => {
        if (prev >= 2) {
          clearInterval(flashInterval);
          return prev;
        }
        
        Animated.sequence([
          Animated.timing(flashAnim, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true
          }),
          Animated.timing(flashAnim, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true
          })
        ]).start();
        
        return prev + 1;
      });
    }, duration / 4);

    // Completion
    const completeTimer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      }).start(() => {
        onComplete();
        setFlashCount(0);
        setShowMessage(false);
      });
    }, duration);

    return () => {
      clearTimeout(messageTimer);
      clearTimeout(completeTimer);
      clearInterval(flashInterval);
    };
  }, [isVisible, duration, onComplete]);

  if (!isVisible) return null;

  const rotate = rotateAnim.interpolate({
    inputRange: [-5, 5],
    outputRange: ['-5deg', '5deg']
  });

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Flash blanc */}
      {flashCount > 0 && (
        <Animated.View style={[styles.flash, { opacity: flashAnim }]} />
      )}

      {/* Cercle de fond */}
      <Animated.View style={[styles.bgCircle, { transform: [{ scale: pulseAnim }] }]} />

      {/* Conteneur caméra */}
      <Animated.View 
        style={[
          styles.cameraContainer,
          { 
            transform: [
              { scale: scaleAnim },
              { rotate },
              { translateY: floatAnim }
            ]
          }
        ]}
      >
        <View style={styles.cameraCircle}>
          <Text style={styles.cameraIcon}>📷</Text>
        </View>

        {/* Particules */}
        {[...Array(8)].map((_, i) => (
          <View
            key={i}
            style={[
              styles.particle,
              {
                backgroundColor: i % 2 === 0 ? '#E8EAF6' : '#5C6BC0',
                transform: [
                  { rotate: `${i * 45}deg` },
                  { translateY: -80 }
                ]
              }
            ]}
          />
        ))}
      </Animated.View>

      {/* Message */}
      {showMessage && (
        <Animated.View 
          style={[
            styles.messageContainer,
            { 
              opacity: messageAnim,
              transform: [{ 
                translateY: messageAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [10, 0]
                })
              }]
            }
          ]}
        >
          <Text style={styles.messageText}>{message}</Text>
          
          <View style={styles.dotsContainer}>
            {dotsAnim.map((dotAnim, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.dot,
                  { 
                    opacity: dotAnim,
                    transform: [{ 
                      scale: dotAnim.interpolate({
                        inputRange: [0.3, 1],
                        outputRange: [1, 1.5]
                      })
                    }]
                  }
                ]}
              />
            ))}
          </View>
        </Animated.View>
      )}

      {/* Vignette */}
      <View style={styles.vignette} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    backgroundColor: '#F8F9FB',
    alignItems: 'center',
    justifyContent: 'center'
  },
  flash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'white'
  },
  bgCircle: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(92, 107, 192, 0.2)'
  },
  cameraContainer: {
    position: 'relative',
    marginBottom: 32,
    width: 120,
    height: 120
  },
  cameraCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#130183',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#130183',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 60,
    elevation: 20
  },
  cameraIcon: {
    fontSize: 56
  },
  particle: {
    position: 'absolute',
    top: 60,
    left: 54,
    width: 12,
    height: 12,
    borderRadius: 6,
    opacity: 0.6
  },
  messageContainer: {
    alignItems: 'center'
  },
  messageText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 8
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 8
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#130183'
  },
  vignette: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(28, 28, 30, 0.05)'
  }
});
