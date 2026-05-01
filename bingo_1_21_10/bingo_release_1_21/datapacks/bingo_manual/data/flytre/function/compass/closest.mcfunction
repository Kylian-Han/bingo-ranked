tag @a remove holding_compass
tag @a remove hold_compass
execute as @a[tag=compass_hunter] if predicate flytre:holding_compass run tag @s add holding_compass

title @a[tag=compass_hunter,tag=holding_compass] actionbar ["",{"text":"Nearest Runner: ","color":"white"},{"selector":"@s"},{"text":" | ","color":"gold"},{"text":"Distance: ","color":"white"},{"score":{"name":"@s","objective":"compass_distance"},"color":"dark_red"}]

data modify storage flytre:detect Pos2 set from entity @s Pos

data modify storage flytre:temp PlayerData set from entity @s
data modify storage flytre:params dimension set from storage flytre:temp PlayerData.Dimension
execute store result storage flytre:params x int 1 run data get storage flytre:temp PlayerData.Pos[0]
execute store result storage flytre:params y int 1 run data get storage flytre:temp PlayerData.Pos[1]
execute store result storage flytre:params z int 1 run data get storage flytre:temp PlayerData.Pos[2]
function flytre:compass/set_tracker with storage flytre:params

tag @s add compass_closest
