import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 sm:p-20 font-sans">
      <main className="flex flex-col gap-8 items-center sm:items-start max-w-2xl w-full">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary rounded md:rounded-sm flex items-center justify-center text-primary-foreground font-bold text-xl">
            S
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Simly</h1>
        </div>
        
        <p className="text-xl text-gray-500 font-light">
          Transformez votre téléphone Android en passerelle SMS professionnelle.
        </p>

        <div className="grid gap-4 w-full sm:grid-cols-2 mt-8">
          <div className="flat-card p-6 rounded hover:bg-gray-50 transition-colors cursor-pointer">
            <div className="h-8 w-8 bg-black text-white rounded-full flex items-center justify-center mb-4 text-sm font-bold">1</div>
            <h3 className="font-semibold mb-2">Téléchargez l'App</h3>
            <p className="text-sm text-gray-500">Installez Simly sur votre Android.</p>
          </div>
          
          <div className="flat-card p-6 rounded hover:bg-gray-50 transition-colors cursor-pointer">
            <div className="h-8 w-8 bg-black text-white rounded-full flex items-center justify-center mb-4 text-sm font-bold">2</div>
            <h3 className="font-semibold mb-2">Scannez le QR</h3>
            <p className="text-sm text-gray-500">Connectez votre appareil en une seconde.</p>
          </div>
        </div>

        <div className="flex gap-4 items-center flex-col sm:flex-row w-full mt-4">
          <button className="rounded-full bg-primary text-primary-foreground border border-transparent transition-colors flex items-center justify-center h-12 px-8 text-base font-medium w-full sm:w-auto hover:opacity-90">
            Commencer maintenant
          </button>
          <button className="rounded-full bg-transparent text-foreground border border-border transition-colors flex items-center justify-center h-12 px-8 text-base font-medium w-full sm:w-auto hover:bg-gray-50">
            Documentation
          </button>
        </div>
      </main>
    </div>
  );
}
