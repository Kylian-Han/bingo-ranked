scoreboard players add supply_drops stage 0

setblock 217 132 98 air

execute if score supply_drops stage matches 0 run setblock 217 132 98 minecraft:acacia_wall_sign[facing=north,waterlogged=false]{front_text: {messages: [{"color":"green","text":"[Setting]"},{"color":"aqua","text":"Supply Drops"},{"italic":false,"color":"green","text":"True"},{"color":"light_purple","click_event":{"action":"run_command","command":"function flytre:settings/supply_drops"},"text":"Click to toggle"}]}}
execute if score supply_drops stage matches 0 run scoreboard players set supply_drops stage 2


execute if score supply_drops stage matches 1 run setblock 217 132 98 minecraft:acacia_wall_sign[facing=north,waterlogged=false]{front_text: {messages: [{"color":"green","text":"[Setting]"},{"color":"aqua","text":"Supply Drops"},{"italic":false,"color":"dark_red","text":"False"},{"color":"light_purple","click_event":{"action":"run_command","command":"function flytre:settings/supply_drops"},"text":"Click to toggle"}]}}
execute if score supply_drops stage matches 1 run scoreboard players set supply_drops stage 0

execute if score supply_drops stage matches 2 run scoreboard players set supply_drops stage 1
