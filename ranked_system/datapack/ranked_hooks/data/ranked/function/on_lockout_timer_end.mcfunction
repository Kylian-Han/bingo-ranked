function flytre:win/count_lockout_tiles_red
function flytre:win/count_lockout_tiles_yellow
function flytre:win/count_lockout_tiles_green
function flytre:win/count_lockout_tiles_blue
scoreboard players set max_tiles_r stage 0
scoreboard players operation max_tiles_r stage > red_tiles stage
scoreboard players operation max_tiles_r stage > yellow_tiles stage
scoreboard players operation max_tiles_r stage > green_tiles stage
scoreboard players operation max_tiles_r stage > blue_tiles stage
execute if score red_tiles stage = max_tiles_r stage run rankedreport end red none
execute if score yellow_tiles stage = max_tiles_r stage run rankedreport end yellow none
execute if score green_tiles stage = max_tiles_r stage run rankedreport end green none
execute if score blue_tiles stage = max_tiles_r stage run rankedreport end blue none
