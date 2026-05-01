execute unless score lockout stage matches 2 run function flytre:team_tp
execute if score lockout stage matches 2 as @s[team=red] run tellraw @s ["",{"text":"Hunters cannot teleport.","color":"dark_red"}]
execute if score lockout stage matches 2 as @s[team=!red] at @s if entity @a[team=red,distance=..100] run tellraw @s ["",{"text":"You cannot teleport when hunters are nearby.","color":"dark_red"}]
execute if score lockout stage matches 2 as @s[team=!red] at @s unless entity @a[team=red,distance=..100] run function flytre:team_tp
