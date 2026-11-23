import { useEffect } from "react";
import { FunctionsPanel } from "./components/FunctionsPanel";
import { AttributesPanel } from "./components/AttributesPanel";
import { ExpressionCanvas } from "./components/ExpressionCanvas";
import { ConfigDialog } from "./components/ConfigDialog";
import { UpdateNotice } from "./components/UpdateNotice";
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
        <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100">
            <UpdateNotice />
            <div className="flex flex-1 min-h-0">
                <FunctionsPanel />
                <ExpressionCanvas />
                <AttributesPanel />
            </div>
            <ConfigDialog />
        </div>
    );
}

export default App;
