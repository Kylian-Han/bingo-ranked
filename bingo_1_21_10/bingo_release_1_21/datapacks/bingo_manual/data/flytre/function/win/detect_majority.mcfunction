execute if score red majority matches ..0 run tellraw @a ["",{"text":"Red has won by majority!","color":"dark_red"}]
execute if score red majority matches ..0 run function flytre:win/all

execute if score yellow majority matches ..0 run tellraw @a ["",{"text":"Yellow has won by majority!","color":"gold"}]
execute if score yellow majority matches ..0 run function flytre:win/all

execute if score green majority matches ..0 run tellraw @a ["",{"text":"Green has won by majority!","color":"green"}]
execute if score green majority matches ..0 run function flytre:win/all

execute if score blue majority matches ..0 run tellraw @a ["",{"text":"Blue has won by majority!","color":"dark_aqua"}]
execute if score blue majority matches ..0 run function flytre:win/all

