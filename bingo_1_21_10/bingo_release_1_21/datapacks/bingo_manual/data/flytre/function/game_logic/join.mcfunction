#If you join mid-game and you aren't already playing that round this function will run, prompting you to choose a team

clear @s
scoreboard players reset @s vote
give @s filled_map[map_id=1,custom_name={"color":"dark_red","italic":false,"text":"Bingo Board"}] 32
gamemode spectator @s
team leave @s

scoreboard players enable @s join
tellraw @s ["",{"text":"Click here to join team Red.","color":"red","clickEvent":{"action":"run_command","value":"/trigger join set 1"}}]
tellraw @s ["",{"text":"Click here to join team Yellow.","color":"yellow","clickEvent":{"action":"run_command","value":"/trigger join set 2"}}]
tellraw @s ["",{"text":"Click here to join team Green.","color":"green","clickEvent":{"action":"run_command","value":"/trigger join set 3"}}]
tellraw @s ["",{"text":"Click here to join team Blue.","color":"dark_aqua","clickEvent":{"action":"run_command","value":"/trigger join set 4"}}]

scoreboard players set @s rejoin 0