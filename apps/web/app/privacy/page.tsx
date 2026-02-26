import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politique de confidentialité — TripRadar",
  description: "Comment TripRadar collecte, utilise et protège vos données personnelles.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen pt-28 pb-24 px-6">
      <div className="max-w-3xl mx-auto prose prose-invert prose-p:text-secondary prose-h2:text-primary prose-h3:text-primary">
        <h1 className="text-4xl font-display font-bold text-primary mb-2">
          Politique de confidentialité
        </h1>
        <p className="text-muted text-sm mb-10">
          Dernière mise à jour : janvier 2025
        </p>

        <h2>1. Responsable du traitement</h2>
        <p>
          TripRadar est édité par une équipe indépendante française. Pour toute
          question relative à vos données, contactez-nous à{" "}
          <a href="mailto:privacy@trigradar.fr" className="text-orange-400 hover:underline">
            privacy@trigradar.fr
          </a>.
        </p>

        <h2>2. Données collectées</h2>
        <h3>2.1 Données que vous nous fournissez</h3>
        <ul>
          <li>Adresse email et mot de passe (compte email/mot de passe)</li>
          <li>Prénom (affiché dans l&apos;application)</li>
          <li>Préférences de voyage : aéroports de départ, budget maximum, destinations</li>
          <li>Token Firebase (si vous activez les notifications push)</li>
        </ul>

        <h3>2.2 Données collectées automatiquement</h3>
        <ul>
          <li>Adresse IP (logs serveur, conservée 30 jours)</li>
          <li>Données d&apos;usage anonymisées (pages visitées, deals consultés)</li>
          <li>Tokens d&apos;authentification (stockés côté serveur, expirés au bout de 7 jours)</li>
        </ul>

        <h3>2.3 Ce que nous ne collectons PAS</h3>
        <ul>
          <li>Données de paiement (vous réservez directement sur les sites partenaires)</li>
          <li>Données de localisation en temps réel</li>
          <li>Contenu de vos communications privées</li>
        </ul>

        <h2>3. Finalités du traitement</h2>
        <p>Vos données sont utilisées pour :</p>
        <ul>
          <li><strong>Authentification</strong> : gérer votre compte et vos sessions</li>
          <li><strong>Alertes personnalisées</strong> : vous notifier des deals correspondant à vos préférences</li>
          <li><strong>Amélioration du service</strong> : analyser les usages pour améliorer l&apos;expérience (données anonymisées)</li>
        </ul>

        <h2>4. Base légale</h2>
        <p>
          Le traitement de vos données est fondé sur l&apos;exécution du contrat (CGU acceptées lors de
          l&apos;inscription) et, pour les communications marketing, sur votre consentement explicite.
        </p>

        <h2>5. Durée de conservation</h2>
        <ul>
          <li>Compte actif : données conservées jusqu&apos;à la suppression du compte</li>
          <li>Après suppression : purge sous 30 jours (sauf obligations légales)</li>
          <li>Alertes envoyées : conservées 12 mois puis supprimées</li>
        </ul>

        <h2>6. Partage des données</h2>
        <p>
          Nous ne vendons jamais vos données. Nous partageons uniquement avec :
        </p>
        <ul>
          <li>
            <strong>Firebase (Google)</strong> — pour les notifications push (token device uniquement)
          </li>
          <li>
            <strong>Resend</strong> — pour l&apos;envoi d&apos;emails d&apos;alertes (email uniquement)
          </li>
          <li>
            <strong>Hébergeur (Hetzner)</strong> — stockage des données sur des serveurs en Europe
          </li>
        </ul>

        <h2>7. Vos droits (RGPD)</h2>
        <p>Conformément au RGPD, vous disposez des droits suivants :</p>
        <ul>
          <li><strong>Droit d&apos;accès</strong> : obtenir une copie de vos données</li>
          <li><strong>Droit de rectification</strong> : corriger des données inexactes</li>
          <li><strong>Droit à l&apos;effacement</strong> : supprimer votre compte et toutes vos données</li>
          <li><strong>Droit d&apos;opposition</strong> : vous opposer aux communications marketing</li>
          <li><strong>Droit à la portabilité</strong> : recevoir vos données dans un format structuré</li>
        </ul>
        <p>
          Pour exercer ces droits, utilisez le bouton &quot;Supprimer mon compte&quot; dans vos paramètres
          ou contactez{" "}
          <a href="mailto:privacy@trigradar.fr" className="text-orange-400 hover:underline">
            privacy@trigradar.fr
          </a>.
        </p>

        <h2>8. Sécurité</h2>
        <p>
          Vos mots de passe sont hachés avec Argon2 (irréversible). Les communications sont chiffrées
          via HTTPS/TLS. Les tokens d&apos;accès expirent après 15 minutes.
        </p>

        <h2>9. Cookies</h2>
        <p>
          TripRadar n&apos;utilise pas de cookies tiers à des fins publicitaires. Seuls des cookies
          techniques (session, préférences) sont utilisés, strictement nécessaires au fonctionnement
          du service.
        </p>

        <h2>10. Contact</h2>
        <p>
          Pour toute question relative à votre vie privée :{" "}
          <a href="mailto:privacy@trigradar.fr" className="text-orange-400 hover:underline">
            privacy@trigradar.fr
          </a>
        </p>
      </div>
    </main>
  );
}
