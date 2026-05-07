import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';
const prisma = new PrismaClient();
async function main(){
 const pw=await bcrypt.hash('password123',10);
 const genre=await prisma.genre.upsert({where:{name:'Pop'},update:{},create:{name:'Pop'}});
 const admin=await prisma.user.upsert({where:{email:'admin@musiccore.local'},update:{},create:{email:'admin@musiccore.local',displayName:'Admin',passwordHash:pw,role:Role.admin}});
 const artist=await prisma.user.upsert({where:{email:'artist@musiccore.local'},update:{},create:{email:'artist@musiccore.local',displayName:'Demo Artist',passwordHash:pw,role:Role.artist}});
 await prisma.artistProfile.upsert({where:{userId:artist.id},update:{bio:'Demo artist profile'},create:{userId:artist.id,bio:'Demo artist profile'}});
 await prisma.track.create({data:{title:'Demo Track',artistId:artist.id,audioPath:'uploads/demo.mp3',genreId:genre.id}});
 console.log('Seeded', admin.email);
}
main().finally(()=>prisma.$disconnect());
