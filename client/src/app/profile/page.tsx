"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { clientRoutes } from "@/shared/consts/clientRoutes";
import "./page.css";

export default function ProfilePage() {
  const router = useRouter();

  const handleBack = useCallback(() => {
    router.push(clientRoutes.classes);
  }, [router]);

  return (
    <main className="profile-page">
      <section className="profile-card">
        <div className="profile-card-topbar">
          <button type="button" className="back-btn" onClick={handleBack}>
            Назад
          </button>
        </div>

        <header className="profile-header">
          <h1>Профиль</h1>
        </header>

        <section className="profile-top">
          <div className="avatar-box">
            <img src="/avatar.jpg" alt="Фото профиля" />
            <button type="button" className="camera-btn" aria-label="Сменить фото">
              📷
            </button>
          </div>

          <div className="profile-identity">
            <h2>Иван Иванов</h2>
            <p>@ivan_ivanov</p>
          </div>
        </section>

        <section className="profile-content">
          <div className="info-section">
            <h3>Личная информация</h3>

            <div className="info-grid">
              <div className="info-card">
                <span>Имя</span>
                <strong>Иван</strong>
                <button type="button" aria-label="Редактировать имя">
                  ✎
                </button>
              </div>

              <div className="info-card">
                <span>Фамилия</span>
                <strong>Иванов</strong>
                <button type="button" aria-label="Редактировать фамилию">
                  ✎
                </button>
              </div>

              <div className="info-card wide">
                <span>Отчество</span>
                <strong>Сергеевич</strong>
                <button type="button" aria-label="Редактировать отчество">
                  ✎
                </button>
              </div>
            </div>

            <p className="hint">
              Вы можете изменить ФИО. Никнейм используется как постоянный
              идентификатор и не редактируется.
            </p>
          </div>
        </section>
      </section>
    </main>
  );
}