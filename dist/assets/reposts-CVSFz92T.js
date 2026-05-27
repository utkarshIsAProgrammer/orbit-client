import{u as r,Q as i}from"./useBaseQuery-Br3BZR6N.js";import{h as o,g as s}from"./index-CmLLe0Bd.js";function g(a,t){return r(a,i)}/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const d=[["path",{d:"M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",key:"1nclc0"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]],k=o("eye",d);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const p=[["path",{d:"M13 21h8",key:"1jsn5i"}],["path",{d:"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",key:"1a8usu"}]],m=o("pen-line",p);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const y=[["circle",{cx:"18",cy:"5",r:"3",key:"gq8acd"}],["circle",{cx:"6",cy:"12",r:"3",key:"w7nqdw"}],["circle",{cx:"18",cy:"19",r:"3",key:"1xt0gg"}],["line",{x1:"8.59",x2:"15.42",y1:"13.51",y2:"17.49",key:"47mynk"}],["line",{x1:"15.41",x2:"8.59",y1:"6.51",y2:"10.49",key:"1n3mei"}]],w=o("share-2",y),f=async a=>{const{data:t}=await s.post(`/api/likes/post/${a}`);return t},h=async a=>{const{data:t}=await s.post(`/api/likes/comment/${a}`);return t},v=async(a,t)=>{const e={},{data:n}=await s.post(`/api/saves/${a}`,e);return n},x=async(a=10,t,e)=>{const n=new URLSearchParams;n.append("limit",a.toString()),t&&n.append("cursor",t),e&&n.append("folder",e);const{data:c}=await s.get(`/api/saves?${n.toString()}`);return c},S=async a=>{const{data:t}=await s.post("/api/saves/folders",{name:a});return t},$=async()=>{const{data:a}=await s.get("/api/saves/folders");return a},P=async(a,t)=>{const{data:e}=await s.put(`/api/saves/folders/${a}`,{name:t});return e},L=async a=>{const{data:t}=await s.delete(`/api/saves/folders/${a}`);return t},_=async a=>{const{data:t}=await s.post(`/api/reposts/${a}`);return t},q=async(a=10,t)=>{const e=new URLSearchParams;e.append("limit",a.toString()),t&&e.append("cursor",t);const{data:n}=await s.get(`/api/reposts?${e.toString()}`);return n};export{k as E,m as P,w as S,q as a,x as b,S as c,L as d,f as e,_ as f,$ as g,v as h,g as i,h as t,P as u};
