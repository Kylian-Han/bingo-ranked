tag @s add me

execute as @s at @s run tag @a[distance=..8] add close_tp

execute as @s[team=red] at @s run tag @r[gamemode=!spectator,tag=!close_tp,tag=!me,team=red,tag=!map_update,scores={death=1..}] add tp
execute as @s[team=yellow] at @s run tag @r[gamemode=!spectator,tag=!close_tp,tag=!me,team=yellow,tag=!map_update,scores={death=1..}] add tp
execute as @s[team=green] at @s run tag @r[gamemode=!spectator,tag=!close_tp,tag=!me,team=green,tag=!map_update,scores={death=1..}] add tp
execute as @s[team=blue] at @s run tag @r[gamemode=!spectator,tag=!close_tp,tag=!me,team=blue,tag=!map_update,scores={death=1..}] add tp

tag @a remove close_tp

execute as @s unless entity @a[tag=tp] run tellraw @s ["",{"text":"You have no available teammate to teleport to!","color":"dark_red"}]

execute as @s if entity @a[tag=tp] run tellraw @s ["",{"text":"Teleporting to ","color":"dark_green"},{"selector":"@a[tag=tp]","color":"dark_green"},{"text":".","color":"dark_green"}]
execute as @s if entity @a[tag=tp] run tp @s @p[tag=tp]
tellraw @a[tag=tp] ["",{"selector":"@a[tag=me]","color":"dark_green"},{"text":" teleported to you.","color":"dark_green"}]

tag @a remove tp
tag @s remove me