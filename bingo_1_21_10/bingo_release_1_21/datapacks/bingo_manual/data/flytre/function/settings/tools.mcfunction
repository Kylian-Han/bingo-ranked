scoreboard players add tools stage 0

setblock 219 132 98 air

execute if score tools stage matches 0 run setblock 219 132 98 minecraft:acacia_wall_sign[facing=west,waterlogged=false]{front_text: {messages: [{"color":"green","text":"[Setting]"},{"color":"aqua","text":"Tools on Respawn"},{"italic":false,"color":"green","text":"True"},{"color":"light_purple","click_event":{"action":"run_command","command":"function flytre:settings/tools"},"text":"Click to toggle"}]}}
execute if score tools stage matches 0 run scoreboard players set tools stage 2


execute if score tools stage matches 1 run setblock 219 132 98 minecraft:acacia_wall_sign[facing=west,waterlogged=false]{front_text: {messages: [{"color":"green","text":"[Setting]"},{"color":"aqua","text":"Tools on Respawn"},{"italic":false,"color":"dark_red","text":"False"},{"color":"light_purple","click_event":{"action":"run_command","command":"function flytre:settings/tools"},"text":"Click to toggle"}]}}
execute if score tools stage matches 1 run scoreboard players set tools stage 0

execute if score tools stage matches 2 run scoreboard players set tools stage 1
