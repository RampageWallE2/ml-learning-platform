import Phaser from 'phaser';

export class WorldScene extends Phaser.Scene {

    private player!: Phaser.Physics.Arcade.Sprite;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

    private readonly WORLD_WIDTH = 3000;
    private readonly WORLD_HEIGHT = 2000;
    private lastDirection: 'down' | 'up' | 'left' | 'right' = 'down';   

    constructor() {
        super('WorldScene');
    }

    preload(): void {
        this.load.spritesheet('player', 'assets/game/characters/character2.png', {frameWidth: 32, frameHeight:32})

    }

    create(): void {

        this.add.rectangle(300, 360, 100, 100, 0xff0000)
        this.add.rectangle(1000, 360, 100, 100, 0x00ff00)
        this.add.rectangle(1500, 700, 100, 100, 0x0000ff)

        this.anims.create({
            key: 'still',
            frames: this.anims.generateFrameNumbers('player', {
                start: 0,
                end: 1
            }),
            frameRate: 6,
            repeat: -1
        });

        this.anims.create({
            key: 'still-up',
            frames: this.anims.generateFrameNumbers('player', {
                start: 24,
                end: 25
            }),
            frameRate: 6,
            repeat: -1
        });

        this.anims.create({
            key: 'still-side',
            frames: this.anims.generateFrameNumbers('player', {
                start: 12,
                end: 13
            }),
            frameRate: 6,
            repeat: -1
        });

        this.anims.create({
            key:'walk-down', 
            frames: this.anims.generateFrameNumbers('player', {
                start: 6,
                end: 11
            }),
            frameRate: 6,
            repeat: -1
        });

        this.anims.create({
            key: 'walk-side',
            frames: this.anims.generateFrameNumbers('player', {
                start: 18,
                end: 23
            }),
            frameRate: 6,
            repeat: -1
        })

        this.anims.create({
            key: 'walk-up',
            frames: this.anims.generateFrameNumbers('player', {
                start: 30,
                end: 35,
            }),
            frameRate: 6,
            repeat: -1
        })
        this.physics.world.setBounds(0, 0, this.WORLD_WIDTH, this.WORLD_HEIGHT);

        this.player = this.physics.add.sprite(640, 360, 'player', 0);


        this.player.setCollideWorldBounds(true);

        //KEYBOARD
        this.cursors = this.input.keyboard!.createCursorKeys();

        this.cameras.main.setBounds(0, 0, this.WORLD_WIDTH, this.WORLD_HEIGHT

        )
        //SEGUIMIENTO DE LA CAMARA AL JUGADOR
        this.cameras.main.startFollow(this.player);

        this.add.text(2000, 1000, 'Zona futura de Machine Learning', {fontSize: '32px', color: '#ffffff'});

    }
    override update(): void {
        const speed = 200;

        let velocityX = 0;
        let velocityY= 0

        this.player.setVelocity(0);

        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-speed);
            this.player.setFlipX(true);
            this.player.anims.play('walk-side', true);
            this.lastDirection = 'left'
        } else if (this.cursors.right.isDown) {
            this.player.setVelocityX(speed);
            this.player.setFlipX(false);
            this.player.anims.play('walk-side', true);
            this.lastDirection = 'right'
        } else if (this.cursors.up.isDown) {
            this.player.setVelocityY(-speed);
            this.player.setFlipX(false);
            this.player.anims.play('walk-up', true);
            this.lastDirection = 'up'
        }else if (this.cursors.down.isDown) {
            this.player.setVelocityY(speed);
            this.player.setFlipX(false);
            this.player.anims.play('walk-down', true);
            this.lastDirection = 'down'
        } else {
            // this.player.anims.stop();
            switch (this.lastDirection) {
                
                case 'down':
                    this.player.setFlipX(false);
                    this.player.anims.play('still', true);
                    break;
                case 'up':
                    this.player.setFlipX(false);
                    this.player.anims.play('still-up', true);
                    break;
                case 'left':
                    this.player.setFlipX(true);
                    this.player.anims.play('still-side', true);
                    break
                case 'right':
                    this.player.setFlipX(false);
                    this.player.anims.play('still-side', true);
                    break;                
            }
        }

    }
}