"use client";
import { Button, Toast } from "@douyinfe/semi-ui";
import { useState, useEffect, useRef, useCallback } from "react";
import styles from "./index.module.css";
import dynamic from "next/dynamic";

const Home = dynamic(() => import('../../views/Home'), { ssr: false });

export default function App() {
  return (
    <main className={styles.main}>
      <Home></Home>
    </main>
  );
}
