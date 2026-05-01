execute unless score lockout stage matches 2 run tellraw @a ["",{"text":"Red has gotten bingo!","color":"dark_red"}]
execute if score lockout stage matches 2 run tellraw @a ["",{"text":"The hunters have killed all runners!","color":"dark_red"}]

function flytre:win/all