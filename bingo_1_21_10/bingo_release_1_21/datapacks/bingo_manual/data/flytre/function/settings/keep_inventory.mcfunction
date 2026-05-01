scoreboard players add keepInventory stage 0

setblock 219 132 96 air

execute if score keepInventory stage matches 0 run setblock 219 132 96 minecraft:acacia_wall_sign[facing=west,waterlogged=false]{front_text: {messages: [{"color":"green","text":"[Setting]"},{"color":"aqua","text":"Keep Inventory"},{"italic":false,"color":"dark_green","text":"True"},{"color":"light_purple","click_event":{"action":"run_command","command":"function flytre:settings/keep_inventory"},"text":"Click me please!"}]}}
execute if score keepInventory stage matches 0 run gamerule keepInventory true
execute if score keepInventory stage matches 0 run scoreboard players set keepInventory stage 2


execute if score keepInventory stage matches 1 run setblock 219 132 96 minecraft:acacia_wall_sign[facing=west,waterlogged=false]{front_text: {messages: [{"color":"green","text":"[Setting]"},{"color":"aqua","text":"Keep Inventory"},{"italic":false,"color":"dark_red","text":"False"},{"color":"light_purple","click_event":{"action":"run_command","command":"function flytre:settings/keep_inventory"},"text":"Don\'t click me!"}]}}
execute if score keepInventory stage matches 1 run gamerule keepInventory false
execute if score keepInventory stage matches 1 run scoreboard players set keepInventory stage 0

execute if score keepInventory stage matches 2 run scoreboard players set keepInventory stage 1
