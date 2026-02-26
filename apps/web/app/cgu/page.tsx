import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Conditions Générales d'Utilisation — TripRadar",
  description: "Conditions générales d'utilisation du service TripRadar.",
};

export default function CguPage() {
  return (
    <main className="min-h-screen pt-28 pb-24 px-6">
      <div className="max-w-3xl mx-auto prose prose-invert prose-p:text-secondary prose-h2:text-primary prose-h3:text-primary">
        <h1 className="text-4xl font-display font-bold text-primary mb-2">
          Conditions Générales d&apos;Utilisation
        </h1>
        <p className="text-muted text-sm mb-10">
          En vigueur depuis : janvier 2025
        </p>

        <h2>1. Présentation du service</h2>
        <p>
          TripRadar est une plateforme d&apos;alertes vols qui agrège et analyse des données de prix
          de vols pour identifier des offres intéressantes (&quot;deals&quot;) et vous en informer.
          TripRadar n&apos;est pas un agent de voyage et ne vend pas de billets d&apos;avion.
        </p>

        <h2>2. Accès au service</h2>
        <p>
          L&apos;utilisation des fonctionnalités de base (consultation des deals) est libre et gratuite.
          La création d&apos;un compte est nécessaire pour recevoir des alertes personnalisées.
          TripRadar se réserve le droit de suspendre tout compte qui enfreindrait les présentes CGU.
        </p>

        <h2>3. Exactitude des informations</h2>
        <p>
          Les prix affichés sur TripRadar sont collectés automatiquement auprès de tiers (Kiwi Tequila,
          compagnies aériennes). Ils sont fournis à titre indicatif et peuvent avoir évolué au moment
          de votre réservation. TripRadar décline toute responsabilité en cas d&apos;écart de prix.
        </p>
        <p>
          <strong>La réservation se fait toujours sur le site du partenaire.</strong> TripRadar n&apos;intervient
          pas dans la transaction commerciale entre vous et la compagnie aérienne ou l&apos;agence.
        </p>

        <h2>4. Propriété intellectuelle</h2>
        <p>
          Le code source, les maquettes, le logo et les textes de TripRadar sont protégés par le droit
          de la propriété intellectuelle. Toute reproduction sans autorisation est interdite.
        </p>

        <h2>5. Limitation de responsabilité</h2>
        <p>TripRadar ne peut être tenu responsable :</p>
        <ul>
          <li>Des variations de prix entre l&apos;affichage et la réservation</li>
          <li>Des interruptions temporaires du service</li>
          <li>Des actions ou omissions des compagnies aériennes partenaires</li>
          <li>Des pertes indirectes résultant de l&apos;utilisation du service</li>
        </ul>

        <h2>6. Données personnelles</h2>
        <p>
          Le traitement de vos données est décrit dans notre{" "}
          <a href="/privacy" className="text-orange-400 hover:underline">
            Politique de confidentialité
          </a>
          , conforme au RGPD.
        </p>

        <h2>7. Modification des CGU</h2>
        <p>
          TripRadar se réserve le droit de modifier les présentes CGU. Les utilisateurs seront informés
          par email en cas de modification substantielle. La poursuite de l&apos;utilisation du service
          après notification vaut acceptation des nouvelles conditions.
        </p>

        <h2>8. Droit applicable</h2>
        <p>
          Les présentes CGU sont soumises au droit français. En cas de litige, les tribunaux français
          sont compétents.
        </p>

        <h2>9. Contact</h2>
        <p>
          Pour toute question :{" "}
          <a href="mailto:contact@trigradar.fr" className="text-orange-400 hover:underline">
            contact@trigradar.fr
          </a>
        </p>
      </div>
    </main>
  );
}
