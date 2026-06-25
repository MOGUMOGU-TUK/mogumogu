import { SafeAreaProvider } from "react-native-safe-area-context";
import { GongguMateApp } from "./src/shell/GongguMateApp";

export default function App() {
  return (
    <SafeAreaProvider>
      <GongguMateApp />
    </SafeAreaProvider>
  );
}
