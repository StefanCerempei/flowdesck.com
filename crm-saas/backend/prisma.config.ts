import { definePrismaConfig } from '@prisma/cli-engine'

export default definePrismaConfig({
    orm: {
        adapter: 'mysql',
        family: 'mysql',
        target: 'node',
    },
})