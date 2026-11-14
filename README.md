# Recto Verso

Des cartes qui se retournent pour apprendre les langues. Quatre modes : Réviser, Jouer (Quiz, Memory, Écris ce que tu vois), Découvrir, Créer.

Application web installable (PWA), 100 % hors ligne, sans compte ni serveur : tout reste sur le téléphone.

## Langues
› Disponibles (phase 1) : français, anglais (GB et US), chinois simplifié, dans tous les sens (par exemple français vers chinois, anglais vers français). 246 mots du quotidien, 156 illustrés.
› En préparation (phase 2) : espagnol, italien, portugais (Portugal et Brésil), allemand. L'interface existe déjà dans ces langues ; elles s'affichent « Bientôt » tant que leur contenu n'est pas prêt.

## Installer
Ouvrir https://michaudjerome.github.io/recto-verso/ puis :
› Android (Chrome) : menu ⋮ › « Ajouter à l'écran d'accueil » (ou le bouton « Installer » proposé par l'app).
› iPhone : uniquement depuis Safari, bouton Partager › « Sur l'écran d'accueil ».

## Données
› Cartes, progression et photos sont stockées sur le téléphone (IndexedDB).
› Réglages › Sauvegarde exporte un fichier qui contient tout ; l'app le rappelle si la dernière sauvegarde date de plus de deux semaines.
› Sur iPhone, Safari peut effacer les données d'un site peu utilisé : installer l'app et sauvegarder de temps en temps évite toute perte.

## Pour modifier
› Textes de l'interface : `tools/build_ui.py`, puis `python tools/build_ui.py`.
› Contenu : `content/author.py` et `content/build_content.py` (génèrent `data/`).
› Avant chaque publication : `python tools/stamp.py` (empreinte des fichiers pour le hors ligne).

## Sources et licences
› Code de l'application : licence MIT.
› ts-fsrs (répétition espacée) : MIT.
› Polices Fraunces, Inter, LXGW WenKai : SIL Open Font License 1.1.
› Contenu (data/) et pictogrammes OpenMoji (pictos/) : CC BY-SA 4.0 ; traductions françaises issues de CFDICT (CC BY-SA 3.0), anglaises vérifiées avec CC-CEDICT (CC BY-SA 4.0) ; niveaux HSK 3.0 (ivankra/hsk30, MIT).

Les textes de licence sont dans le dossier LICENSES.
