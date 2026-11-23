import { useEffect } from "react";
import { FunctionsPanel } from "./components/FunctionsPanel";
import { AttributesPanel } from "./components/AttributesPanel";
import { ExpressionCanvas } from "./components/ExpressionCanvas";
import { ConfigDialog } from "./components/ConfigDialog";
import { subscribeStoredConfig } from "./api/config";
import { useExpressionStore } from "./store";

function App() {
    const saveConnectionConfig = useExpressionStore(
        (s) => s.saveConnectionConfig,
    );

    // Reconnect when the extension popup saves new credentials
    useEffect(
        () => subscribeStoredConfig(saveConnectionConfig),
        [saveConnectionConfig],
    );

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-slate-100">
            <FunctionsPanel />
            <ExpressionCanvas />
            <AttributesPanel />
            <ConfigDialog />
        </div>
    );
}

export default App;
