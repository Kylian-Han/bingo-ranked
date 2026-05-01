scoreboard players add colorblind stage 0

setblock 215 132 98 air

execute if score colorblind stage matches 0 run setblock 215 132 98 minecraft:acacia_wall_sign[facing=east,waterlogged=false]{front_text: {messages: [{"color":"green","text":"[Setting]"},{"color":"aqua","text":"Colorblind Mode"},{"italic":false,"color":"dark_green","text":"True"},{"color":"light_purple","click_event":{"action":"run_command","command":"function flytre:settings/colorblind"},"text":"Click to toggle"}]}}
execute if score colorblind stage matches 0 run scoreboard players set colorblind stage 2


execute if score colorblind stage matches 1 run setblock 215 132 98 minecraft:acacia_wall_sign[facing=east,waterlogged=false]{front_text: {messages: [{"color":"green","text":"[Setting]"},{"color":"aqua","text":"Colorblind Mode"},{"italic":false,"color":"dark_red","text":"False"},{"color":"light_purple","click_event":{"action":"run_command","command":"function flytre:settings/colorblind"},"text":"Click to toggle"}]}}
execute if score colorblind stage matches 1 run scoreboard players set colorblind stage 0

execute if score colorblind stage matches 2 run scoreboard players set colorblind stage 1