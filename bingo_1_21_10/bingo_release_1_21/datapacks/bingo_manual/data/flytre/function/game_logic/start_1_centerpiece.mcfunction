tellraw @a ["",{"text":"Please wait for chunks to be generated.","color":"dark_green"}]
execute if score lockout stage matches 2 run tellraw @a ["",{"text":"Game type: ","color":"white"}, {"text":"Manhunt","color":"red"}]
execute if score lockout stage matches 1 run tellraw @a ["",{"text":"Game type: ","color":"white"}, {"text":"Lockout","color":"green"}]
execute if score lockout stage matches 0 run tellraw @a ["",{"text":"Game type: ","color":"white"}, {"text":"Bingo","color":"green"}]

execute in minecraft:the_nether run forceload remove all
forceload remove all
forceload add -64 -64 63 63
scoreboard players reset forceload_time stage
scoreboard players reset forceloaded stage
scoreboard players reset forceload_neth stage
title @a actionbar ["",{"text":"-:--","color":"gold"}, {"text":" | ","color":"white"}, {"text":"Waiting for chunk to load...","color":"green"}]


execute as @s at @s unless score item_set stage matches 2 run tp @s ~ ~ ~
execute as @s at @s unless score item_set stage matches 2 run spreadplayers ~ ~ 1 10000000 false @s
execute as @s at @s unless score item_set stage matches 2 store success score forceloaded stage run forceload add ~ ~
execute as @s at @s unless score item_set stage matches 2 run setworldspawn ~ ~ ~
execute as @s at @s unless score item_set stage matches 2 run data modify storage flytre:detect Center set from entity @s Pos
execute as @s at @s if score item_set stage matches 2 in minecraft:the_nether run tp @s 0 100 0
execute as @s at @s if score item_set stage matches 2 in minecraft:the_nether store success score forceload_neth stage run forceload add ~ ~