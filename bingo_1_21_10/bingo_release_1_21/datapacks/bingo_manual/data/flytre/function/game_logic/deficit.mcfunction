function flytre:game_logic/count_players
scoreboard players operation dH stage = red stage
scoreboard players operation dH stage -= yellow stage
scoreboard players operation dH stage -= green stage
scoreboard players operation dH stage -= blue stage


execute if score dH stage matches ..-1 run item replace entity @s hotbar.4 with bow[lore=['{"text":"Perk due to number","color":"gray","italic":true}','{"text":"of runners.","color":"gray","italic":true}'],custom_data={start:1}]
execute if score dH stage matches ..-1 run item replace entity @s inventory.0 with arrow[lore=['{"text":"Perk due to number","color":"gray","italic":true}','{"text":"of runners.","color":"gray","italic":true}'],custom_data={start:1}] 3


execute if score dH stage matches ..-2 run item replace entity @s hotbar.0 with stone_sword[lore=['{"text":"Perk due to number","color":"gray","italic":true}','{"text":"of runners.","color":"gray","italic":true}'],custom_data={start:1}]
execute if score dH stage matches ..-2 run item replace entity @s hotbar.1 with stone_axe[enchantments={"minecraft:efficiency":2},lore=['{"text":"Perk due to number","color":"gray","italic":true}','{"text":"of runners.","color":"gray","italic":true}'],custom_data={start:1}]

execute if score dH stage matches ..-3 run item replace entity @s hotbar.7 with bread[lore=['{"text":"Perk due to number","color":"gray","italic":true}','{"text":"of runners.","color":"gray","italic":true}'],custom_data={start:1}] 4
execute if score dH stage matches ..-3 run effect give @s speed 1000000 0 true

execute if score dH stage matches ..-4 run effect give @s regeneration 1000000 0 true

execute if score dH stage matches ..-5 run item replace entity @s armor.chest with iron_chestplate[lore=['{"text":"Perk due to number","color":"gray","italic":true}','{"text":"of runners.","color":"gray","italic":true}'],custom_data={start:1}]

execute if score dH stage matches ..-6 run item replace entity @s hotbar.0 with iron_sword[lore=['{"text":"Perk due to number","color":"gray","italic":true}','{"text":"of runners.","color":"gray","italic":true}'],custom_data={start:1}]
execute if score dH stage matches ..-6 run item replace entity @s hotbar.5 with shield[lore=['{"text":"Perk due to number","color":"gray","italic":true}','{"text":"of runners.","color":"gray","italic":true}'],custom_data={start:1}]

execute if score dH stage matches ..-7 run item replace entity @s armor.legs with iron_leggings[lore=['{"text":"Perk due to number","color":"gray","italic":true}','{"text":"of runners.","color":"gray","italic":true}'],custom_data={start:1}]
execute if score dH stage matches ..-7 run item replace entity @s armor.feet with iron_boots[lore=['{"text":"Perk due to number","color":"gray","italic":true}','{"text":"of runners.","color":"gray","italic":true}'],custom_data={start:1}]

execute if score dH stage matches ..-8 run item replace entity @s armor.head with iron_helmet[lore=['{"text":"Perk due to number","color":"gray","italic":true}','{"text":"of runners.","color":"gray","italic":true}'],custom_data={start:1}]
execute if score dH stage matches ..-8 run item replace entity @s hotbar.2 with iron_pickaxe[enchantments={"minecraft:efficiency":2},lore=['{"text":"Perk due to number","color":"gray","italic":true}','{"text":"of runners.","color":"gray","italic":true}'],custom_data={start:1}]

execute if score dH stage matches ..-9 run item replace entity @s hotbar.4 with bow[enchantments={"minecraft:power":2},lore=['{"text":"Perk due to number","color":"gray","italic":true}','{"text":"of runners.","color":"gray","italic":true}'],custom_data={start:1}]
execute if score dH stage matches ..-9 run item replace entity @s inventory.0 with arrow[lore=['{"text":"Perk due to number","color":"gray","italic":true}','{"text":"of runners.","color":"gray","italic":true}'],custom_data={start:1}] 5


execute if score dH stage matches ..-10 run item replace entity @s hotbar.0 with diamond_sword[lore=['{"text":"Perk due to number","color":"gray","italic":true}','{"text":"of runners.","color":"gray","italic":true}'],custom_data={start:1}] 1
execute if score dH stage matches ..-10 run item replace entity @s hotbar.6 with golden_apple[lore=['{"text":"Perk due to number","color":"gray","italic":true}','{"text":"of runners.","color":"gray","italic":true}'],custom_data={start:1}] 2






