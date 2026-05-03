# Spécifications Techniques & Mathématiques : Système d'Elo - Bingo Speedrun

## 1. Contexte et Règles Globales
*   **Mode de jeu :** Bingo Speedrun (Minecraft). Grille de 25 items.
*   **Format d'équipe :** Asymétrique, de 1 à 4 équipes. Jusqu'à 5 joueurs par équipe.
*   **Condition de fin :** "Winner Takes All" (1 seule équipe gagnante, toutes les autres sont perdantes).
*   **Valeur Initiale :** Chaque nouveau joueur commence avec **300 d'Elo**.

---

## 2. Variables de Calcul

L'évolution de l'Elo est calculée individuellement pour chaque joueur contre la moyenne des joueurs adverses.

*   $E_{joueur}$ : L'Elo actuel du joueur pour lequel on fait le calcul.
*   $E_{adverses}$ : La moyenne mathématique stricte de l'Elo de tous les joueurs composant la ou les équipe(s) adverse(s).
*   $B_{victoire}$ : Les points de base gagnés (Inflation légère : **20** en duel, **35** en multi-équipes).
*   $B_{defaite}$ : Les points de base perdus (Inflation légère : **-20** en duel, **-11** en multi-équipes).
*   $N_{max}$ : Le nombre de joueurs dans l'équipe la plus peuplée de la partie.
*   $N_{equipe}$ : Le nombre de joueurs dans l'équipe du joueur évalué.
*   $\lceil x \rceil$ : La fonction mathématique "partie entière supérieure" (arrondi à l'entier supérieur).

---

## 3. Formules Mathématiques de Base

La mise à l'échelle de l'Elo utilise un ratio linéaire de $1/50$ de la différence d'Elo.

### A. Cas d'une Victoire (Classique)
Le gain de base ($G_{base}$) se calcule à partir de l'Elo du joueur et de la moyenne adverse :

$$G_{base} = B_{victoire} + \frac{E_{adverses} - E_{joueur}}{50}$$

S'il n'y a **aucun modificateur** (les équipes ont le même nombre de joueurs et la partie a duré plus de 5 minutes), le gain final ($G$) est simplement la valeur de base arrondie à l'entier supérieur :

$$G = \lceil G_{base} \rceil$$

Le nouvel Elo du joueur gagnant sera :

$$Elo_{nouveau} = E_{joueur} + G$$

### B. Cas d'une Défaite
Le calcul des points perdus ($P$) se fait toujours sans modificateur (le résultat sera négatif) :

$$P = \left\lceil B_{defaite} + \frac{E_{adverses} - E_{joueur}}{50} \right\rceil$$

Le nouvel Elo du joueur perdant sera :

$$Elo_{nouveau} = E_{joueur} + P$$

*(Note : L'arrondi supérieur $\lceil x \rceil$ sur un nombre négatif se rapproche de zéro, par exemple $\lceil -3.6 \rceil = -3$).*

---

## 4. Modificateurs et Protections (Edge Cases)

Ces règles s'appliquent à la fin des calculs (sur le gain de base $G_{base}$ de l'équipe gagnante défini dans la section 3.A).

### Règle 4.1 : Le Bonus de Désavantage Numérique
*   **Condition :** L'équipe gagnante compte moins de joueurs que l'équipe adverse la plus nombreuse.
*   **Action :** Appliquer un multiplicateur au gain de base ($G_{base}$) avant l'arrondi.
*   **Valeur :** **+20%** de gain par joueur manquant par rapport à l'équipe la plus grande.
*   **Application :** 

$$G_{multiplie} = \left\lceil G_{base} \times \left(1 + 0.20 \times (N_{max} - N_{equipe})\right) \right\rceil$$

*(Si l'équipe n'est pas en désavantage numérique, cette étape est ignorée et on considère que $G_{multiplie} = \lceil G_{base} \rceil$)*

### Règle 4.2 : Le Bonus de Speedrun (Partie < 5 minutes)
*   **Condition :** Si la durée totale de la partie est strictement inférieure à **5 minutes**.
*   **Action :** Le calcul de l'Elo est maintenu, mais on ajoute un bonus plat de **+3 Elo** au gain final (après l'application du multiplicateur éventuel de désavantage numérique). Aucun impact sur la perte de l'équipe adverse.
*   **Application :** Le gain final ($G$) devient :

$$G = G_{multiplie} + 3$$

---

## 5. Exemple de Simulation

**Scénario :** Match à 4 équipes. L'équipe du gagnant a **2 joueurs**. L'équipe la plus grosse a **5 joueurs**.
*   **Joueur Cible (Gagnant) :** $E_{joueur} = 550$
*   **Moyenne globale des 3 équipes perdantes :** $E_{adverses} = 470$
*   **Base (Multi-équipes) :** $B_{victoire} = 35$
*   **Tailles :** $N_{max} = 5$ et $N_{equipe} = 2$ (Désavantage de 3 joueurs).

**Exécution du calcul :**

1. Gain de base :
$$G_{base} = 35 + \frac{470 - 550}{50}$$
$$G_{base} = 35 + \left(\frac{-80}{50}\right) = 35 - 1.6 = 33.4$$

2. Application du multiplicateur (Infériorité numérique) :
$$Multiplicateur = 1 + 0.20 \times (5 - 2) = 1 + 0.60 = 1.60$$

3. Gain Final ($G$) :
$$G = \lceil 33.4 \times 1.60 \rceil$$
$$G = \lceil 53.44 \rceil = 54$$

**Résultat :** Le joueur a réussi un exploit en gagnant en 2v5 contre un lobby de niveau correct. Grâce au multiplicateur, il gagne **54 points** et passe de 550 à 604 d'Elo.