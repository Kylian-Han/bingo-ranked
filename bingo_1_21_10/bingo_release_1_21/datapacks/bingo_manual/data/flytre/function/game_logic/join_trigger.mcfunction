#Once you've clicked a chat message to join a team this function runs

#Teleport to a member of your new team
execute as @s[scores={join=1}] run tp @s @r[team=red]
execute as @s[scores={join=2}] run tp @s @r[team=yellow]
execute as @s[scores={join=3}] run tp @s @r[team=green]
execute as @s[scores={join=4}] run tp @s @r[team=blue]


#Give an error if you try and join a team not in use
execute as @s[scores={join=1}] unless entity @a[team=red] run tellraw @s ["",{"text":"You may not start a new team.","color":"dark_red"}]
execute as @s[scores={join=2}] unless entity @a[team=yellow] run tellraw @s ["",{"text":"You may not start a new team.","color":"dark_red"}]
execute as @s[scores={join=3}] unless entity @a[team=green] run tellraw @s ["",{"text":"You may not start a new team.","color":"dark_red"}]
execute as @s[scores={join=4}] unless entity @a[team=blue] run tellraw @s ["",{"text":"You may not start a new team.","color":"dark_red"}]
execute as @s[scores={join=1}] unless entity @a[team=red] run scoreboard players set @s rejoin 1
execute as @s[scores={join=2}] unless entity @a[team=yellow] run scoreboard players set @s rejoin 1
execute as @s[scores={join=3}] unless entity @a[team=green] run scoreboard players set @s rejoin 1
execute as @s[scores={join=4}] unless entity @a[team=blue] run scoreboard players set @s rejoin 1


#Join the team you're trying to join
execute as @s[scores={join=1}] if entity @a[team=red] run team join red
execute as @s[scores={join=2}] if entity @a[team=yellow] run team join yellow
execute as @s[scores={join=3}] if entity @a[team=green] run team join green
execute as @s[scores={join=4}] if entity @a[team=blue] run team join blue

#If the player ran trigger into a weird value
tellraw @s[scores={join=5..}]  ["",{"text":"Please don't mess with triggers.","color":"dark_red"}]



#If you have joined a team successful give tools, set gamemode, spawnpoint, etc.
gamemode survival @s[team=!]

#tools
execute if score tools stage matches 1 run item replace entity @s[team=!] hotbar.0 with minecraft:stone_sword[custom_data={start:1}]
execute if score tools stage matches 1 run item replace entity @s[team=!] hotbar.1 with minecraft:stone_axe[custom_data={start:1},enchantments={"minecraft:efficiency":2}]
execute if score tools stage matches 1 unless score item_set stage matches 2 run item replace entity @s[team=!] hotbar.2 with minecraft:stone_pickaxe[custom_data={start:1},enchantments={"minecraft:efficiency":2}]
execute if score tools stage matches 1 if score item_set stage matches 2 run item replace entity @s[team=!] hotbar.2 with minecraft:iron_pickaxe[custom_data={start:1}]
execute if score tools stage matches 1 run item replace entity @s[team=!] hotbar.3 with minecraft:stone_shovel[custom_data={start:1},enchantments={"minecraft:efficiency":2}]
execute if score lockout stage matches 2 run item replace entity @s[team=!] hotbar.8 with minecraft:compass[lodestone_tracker={target:{dimension:"minecraft:overworld",pos:[I;0,64,0]},tracked:false},custom_name={"color":"red","italic":false,"text":"Tracker"},custom_data={tracker:1}]

item replace entity @s[team=!] weapon.offhand with filled_map[map_id=1,custom_name={"color":"dark_red","italic":false,"text":"Bingo Board"}] 32

execute at @s[team=!] run spawnpoint @s[team=!] ~ ~ ~
execute at @s[team=!] run scoreboard players set @s death 10


#If you weren't able to join a team try again, otherwise stop trigger
scoreboard players reset @s join
scoreboard players enable @s[team=] join