#Start the game!

#Open cages and give slow falling
tellraw @a ["",{"text":"Releasing hunters...","color":"dark_green"}]

tag @a remove hunter
execute if score lockout stage matches 2 run tag @a[team=red] add hunter
scoreboard players set hunters_released stage 1


execute as @a[tag=hunter,team=!] at @s run fill ~-3 ~-3 ~-3 ~3 ~3 ~3 air
effect clear @a[tag=hunter,team=!] invisibility
effect give @a[tag=hunter,team=!] minecraft:slow_falling 20 0 true
effect give @a[tag=hunter,team=!] minecraft:resistance 25 4 true

gamemode survival @a[tag=hunter]

#no-tp = spectator
execute positioned 0 100 0 as @a[tag=hunter,distance=..2000] run team leave @s
execute positioned 0 100 0 as @a[tag=hunter,distance=..2000] run gamemode spectator @s



#give starting tools
clear @a[tag=hunter]
item replace entity @a[tag=hunter] hotbar.0 with minecraft:wooden_sword[custom_data={start:1}]
item replace entity @a[tag=hunter] hotbar.1 with minecraft:wooden_axe[custom_data={start:1}]
execute unless score item_set stage matches 2 run item replace entity @a[tag=hunter] hotbar.2 with minecraft:stone_pickaxe[enchantments={"minecraft:efficiency":2},custom_data={start:1}]
execute if score item_set stage matches 2 run item replace entity @a[tag=hunter] hotbar.2 with minecraft:iron_pickaxe[custom_data={start:1}]
item replace entity @a[tag=hunter] hotbar.3 with minecraft:stone_shovel[enchantments={"minecraft:efficiency":2},custom_data={start:1}]
execute if score item_set stage matches 2 run item replace entity @a[tag=hunter] hotbar.7 with minecraft:bread[lore=['{"color":"gray","italic":true,"text":"Grandma\'s Special! Does not respawn"}']] 16
item replace entity @a[tag=hunter] weapon.offhand with filled_map[custom_name={"text":"Bingo Board","color":"dark_red","italic":false},map_id=1,custom_data={start:1}] 32

item replace entity @a[tag=hunter] hotbar.8 with minecraft:compass[lodestone_tracker={target:{dimension:"minecraft:overworld",pos:[I;0,64,0]},tracked:false},custom_name={"color":"red","italic":false,"text":"Tracker"},custom_data={tracker:1}]

execute as @a[tag=hunter] run function flytre:game_logic/deficit