import { createRouter, createWebHistory } from 'vue-router';
import HomePage from '../pages/HomePage.vue';
import ArtistListPage from '../pages/ArtistListPage.vue';
import ArtistDetailPage from '../pages/ArtistDetailPage.vue';
import TrackListPage from '../pages/TrackListPage.vue';
import LoginPage from '../pages/LoginPage.vue';
import RegisterPage from '../pages/RegisterPage.vue';
import ListenerDashboard from '../pages/ListenerDashboard.vue';
import PlaylistPage from '../pages/PlaylistPage.vue';
import ArtistDashboard from '../pages/ArtistDashboard.vue';
import ArtistUploadPage from '../pages/ArtistUploadPage.vue';
import ArtistTrackManagementPage from '../pages/ArtistTrackManagementPage.vue';
import AdminDashboard from '../pages/AdminDashboard.vue';
export const router=createRouter({history:createWebHistory(),routes:[
{path:'/',component:HomePage},{path:'/artists',component:ArtistListPage},{path:'/artists/:id',component:ArtistDetailPage},{path:'/tracks',component:TrackListPage},{path:'/login',component:LoginPage},{path:'/register',component:RegisterPage},{path:'/dashboard',component:ListenerDashboard},{path:'/playlists/:id',component:PlaylistPage},{path:'/artist',component:ArtistDashboard},{path:'/artist/upload',component:ArtistUploadPage},{path:'/artist/tracks',component:ArtistTrackManagementPage},{path:'/admin',component:AdminDashboard}
]});
