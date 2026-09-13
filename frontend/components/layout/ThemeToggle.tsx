"use client";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
export function ThemeToggle(){const [dark,setDark]=useState(false);useEffect(()=>{const saved=localStorage.getItem("voxen-theme");const next=saved ? saved === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;setDark(next);document.documentElement.dataset.theme=next?"dark":"light";},[]);function toggle(){const next=!dark;setDark(next);document.documentElement.dataset.theme=next?"dark":"light";localStorage.setItem("voxen-theme",next?"dark":"light");}return <button className="button icon-button" type="button" onClick={toggle} aria-label={dark?"Use light appearance":"Use dark appearance"}>{dark?<Sun size={17}/>:<Moon size={17}/>}</button>}
