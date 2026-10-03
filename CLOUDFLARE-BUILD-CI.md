# Vérification Cloudflare / OpenNext sous Linux

Le workflow `.github/workflows/cloudflare-build.yml` exécute la vérification sur
`ubuntu-24.04` chez GitHub. Il ne nécessite aucune installation Ubuntu ou WSL sur
votre ordinateur et aucun secret GitHub.

Il installe les versions du `package-lock.json` avec Node.js 22, génère le client
Prisma, lance ESLint, construit Next.js avec OpenNext et vérifie le bundle avec
`wrangler deploy --dry-run`. Cette dernière commande prépare le bundle localement
sans le publier. Les fichiers produits sont conservés trois jours dans un artefact
GitHub nommé `pedagoplus-ai-cloudflare`.

## Isolation de la production

- Aucun token Cloudflare ni secret Clerk n'est injecté et aucune étape ne déploie.
- `DATABASE_URL` vise `127.0.0.1:1`, sans serveur de base dans le job. Une requête
  accidentelle échoue ; elle ne doit pas être résolue en ajoutant une URL de production.
- La clé publique Clerk est factice et utilise un domaine `.invalid`.
- Les fichiers `.env`, `.env.*`, `.dev.vars` et `.dev.vars.*` présents dans le checkout
  font échouer le job avant l'installation des dépendances.
- Aucune migration, commande `db push`, seed ou requête de vérification n'est lancée.
- Le token GitHub est limité à la lecture du contenu et n'est pas conservé par Git.

## Lancer la vérification

1. Enregistrez et poussez le workflow et les sources à vérifier dans votre dépôt
   GitHub. Pour sélectionner uniquement les deux fichiers de cette préparation :

   ```powershell
   git add .github/workflows/cloudflare-build.yml CLOUDFLARE-BUILD-CI.md
   git commit -m "ci: verify Cloudflare build without deployment or production secrets"
   git push
   ```

   Les autres modifications locales doivent être enregistrées et poussées si vous
   voulez aussi les vérifier : GitHub Actions ne voit pas les fichiers non commités.

2. Le workflow se lance automatiquement lors d'une pull request et lors d'un push
   sur `main`. Pour un lancement manuel, le workflow doit d'abord être présent sur
   la branche par défaut du dépôt.
3. Dans GitHub, ouvrez **Actions → Cloudflare build verification → Run workflow**,
   choisissez la branche à vérifier, puis cliquez sur **Run workflow**.
4. Ouvrez le job `build` et consultez les étapes. Un résultat vert confirme le lint,
   le build OpenNext et la préparation locale du bundle Wrangler.
5. Téléchargez l'artefact `pedagoplus-ai-cloudflare` depuis la page de l'exécution
   si vous souhaitez examiner les fichiers produits. Il contient des valeurs
   factices et sert à la vérification, pas à un déploiement de production.

En cas d'échec, consultez la première étape rouge. Une erreur de connexion à la
base indique qu'un chemin exécuté pendant le build dépend de données : corrigez
ce chemin ou préparez une base de test isolée, sans utiliser la production.
La clé Clerk factice ne permet pas de tester une connexion utilisateur réelle.

Cette vérification ne démarre pas l'application et ne valide pas son fonctionnement
complet dans Workers. Le résultat du build Linux sera connu après l'exécution sur
GitHub ; aucun build Linux n'a été lancé par la préparation locale.
