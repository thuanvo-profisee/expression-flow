import { FunctionsPanel } from "./components/FunctionsPanel";
import { AttributesPanel } from "./components/AttributesPanel";
import { ExpressionCanvas } from "./components/ExpressionCanvas";

function App() {
    return (
        <div className="flex h-screen w-screen overflow-hidden bg-slate-100">
            <FunctionsPanel />
            <ExpressionCanvas />
            <AttributesPanel />
        </div>
    );
}

export default App;
