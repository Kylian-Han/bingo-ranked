scoreboard players add close_spread stage 0

setblock 215 132 96 air

execute if score close_spread stage matches 0 run setblock 215 132 96 minecraft:acacia_wall_sign[facing=east,waterlogged=false]{front_text: {messages: [{"color":"green","text":"[Setting]"},{"color":"aqua","text":"Team Distance"},{"italic":false,"color":"green","text":"Close"},{"color":"light_purple","click_event":{"action":"run_command","command":"function flytre:settings/closer_spawns"},"text":"Click to change"}]}}
execute if score close_spread stage matches 0 run scoreboard players set close_spread stage 2


execute if score close_spread stage matches 1 run setblock 215 132 96 minecraft:acacia_wall_sign[facing=east,waterlogged=false]{front_text: {messages: [{"color":"green","text":"[Setting]"},{"color":"aqua","text":"Team Distance"},{"italic":false,"color":"green","text":"Normal"},{"color":"light_purple","click_event":{"action":"run_command","command":"function flytre:settings/closer_spawns"},"text":"Click to change"}]}}
execute if score close_spread stage matches 1 run scoreboard players set close_spread stage 0

execute if score close_spread stage matches 2 run scoreboard players set close_spread stage 1
