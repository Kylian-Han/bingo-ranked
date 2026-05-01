scoreboard players add item_set stage 0

setblock 215 132 94 air

#ocean set disabled for now


execute if score item_set stage matches 2 run setblock 215 132 94 minecraft:acacia_wall_sign[facing=east,waterlogged=false]{front_text: {messages: [{"color":"green","text":"[Setting]"},{"color":"aqua","text":"Item Set"},{"italic":false,"color":"green","text":"Normal"},{"color":"light_purple","click_event":{"action":"run_command","command":"function flytre:settings/item_set"},"text":"Click to change"}]}}
execute if score item_set stage matches 2 run scoreboard players set item_set stage 3

execute if score item_set stage matches 1 run setblock 215 132 94 minecraft:acacia_wall_sign[facing=east,waterlogged=false]{front_text: {messages: [{"color":"green","text":"[Setting]"},{"color":"aqua","text":"Item Set"},{"italic":false,"color":"green","text":"Nether"},{"color":"light_purple","click_event":{"action":"run_command","command":"function flytre:settings/item_set"},"text":"Click to change"}]}}
execute if score item_set stage matches 1 run scoreboard players set item_set stage 2

execute if score item_set stage matches 0 run setblock 215 132 94 minecraft:acacia_wall_sign[facing=east,waterlogged=false]{front_text: {messages: [{"color":"green","text":"[Setting]"},{"color":"aqua","text":"Item Set"},{"italic":false,"color":"green","text":"Speed"},{"color":"light_purple","click_event":{"action":"run_command","command":"function flytre:settings/item_set"},"text":"Click to change"}]}}
execute if score item_set stage matches 0 run scoreboard players set item_set stage 1


execute if score item_set stage matches 3.. run scoreboard players set item_set stage 0
