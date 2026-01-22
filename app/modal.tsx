import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet } from 'react-native';

import EditScreenInfo from '@/components/EditScreenInfo';
import { Text, View } from 'react-native';
import Colors from '@/constants/Colors';
import { GlobalStyles } from '@/constants/Styles';

export default function ModalScreen() {
  return (
    <View style={GlobalStyles.container}>
      <Text style={styles.title}>Modal</Text>
      <View style={styles.separator} />
      <EditScreenInfo path="app/modal.tsx" />

      {/* Use a light status bar on iOS to account for the black space above the modal */}
      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.text,
    textAlign: 'center',
    marginTop: 20,
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: '80%',
    backgroundColor: Colors.light.border,
    alignSelf: 'center',
  },
});
