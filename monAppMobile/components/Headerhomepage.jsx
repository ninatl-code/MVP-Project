import React from 'react';
import BottomNavBar from './BottomNavBar';
import ShootyLogoSimple from './ShootyLogo';
import { View, StyleSheet } from 'react-native';

export default function Headerhomepage() {
  return (
    <View style={styles.container}>
      <View style={styles.logoWrap}>
        <ShootyLogoSimple width={48} height={48} />
      </View>
      <BottomNavBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    alignItems: 'center',
    zIndex: 10,
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    paddingBottom: 2,
  },
});
