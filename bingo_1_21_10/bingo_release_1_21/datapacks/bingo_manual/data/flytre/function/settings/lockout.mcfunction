scoreboard players add lockout stage 0

setblock 219 132 94 air

execute if score lockout stage matches 3 run setblock 219 132 94 minecraft:acacia_wall_sign[facing=west,waterlogged=false]{front_text: {messages: [{"color":"green","text":"[Setting]"},{"color":"aqua","text":"Mode"},{"italic":false,"color":"green","text":"Bingo"},{"color":"light_purple","click_event":{"action":"run_command","command":"function flytre:settings/lockout"},"text":"Click to change"}]}}
execute if score lockout stage matches 3 run scoreboard players set lockout stage 4

execute if score lockout stage matches 2 run setblock 219 132 94 minecraft:acacia_wall_sign[facing=west,waterlogged=false]{front_text: {messages: [{"color":"green","text":"[Setting]"},{"color":"aqua","text":"Mode"},{"italic":false,"color":"green","text":"Blackout"},{"color":"light_purple","click_event":{"action":"run_command","command":"function flytre:settings/lockout"},"text":"Click to change"}]}}
execute if score lockout stage matches 2 run scoreboard players set lockout stage 3


execute if score lockout stage matches 1 run setblock 219 132 94 minecraft:acacia_wall_sign[facing=west,waterlogged=false]{front_text: {messages: [{"color":"green","text":"[Setting]"},{"color":"aqua","text":"Mode"},{"italic":false,"color":"green","text":"Manhunt"},{"color":"light_purple","click_event":{"action":"run_command","command":"function flytre:settings/lockout"},"text":"Click to change"}]}}
execute if score lockout stage matches 1 run scoreboard players set lockout stage 2

execute if score lockout stage matches 0 run setblock 219 132 94 minecraft:acacia_wall_sign[facing=west,waterlogged=false]{front_text: {messages: [{"color":"green","text":"[Setting]"},{"color":"aqua","text":"Mode"},{"italic":false,"color":"green","text":"Lockout"},{"color":"light_purple","click_event":{"action":"run_command","command":"function flytre:settings/lockout"},"text":"Click to change"}]}}
execute if score lockout stage matches 0 run scoreboard players set lockout stage 1


execute if score lockout stage matches 4 run scoreboard players set lockout stage 0
