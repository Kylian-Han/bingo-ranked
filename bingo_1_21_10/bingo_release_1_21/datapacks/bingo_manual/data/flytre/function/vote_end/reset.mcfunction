tellraw @a[team=!] ["",{"text":"Draw votes have been reset. Another vote cannot be cast for 5 minutes.","color":"dark_red"}]
scoreboard players reset * vote
scoreboard players set vote_cooldown vote 6000