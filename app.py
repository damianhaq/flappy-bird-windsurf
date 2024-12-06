from flask import Flask, request, jsonify, render_template
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import os

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///scores.db')
if app.config['SQLALCHEMY_DATABASE_URI'].startswith("postgres://"):
    app.config['SQLALCHEMY_DATABASE_URI'] = app.config['SQLALCHEMY_DATABASE_URI'].replace("postgres://", "postgresql://", 1)
db = SQLAlchemy(app)

class Score(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    player_name = db.Column(db.String(50), nullable=False)
    score = db.Column(db.Integer, nullable=False)
    date = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

with app.app_context():
    db.create_all()

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/scores', methods=['POST'])
def save_score():
    data = request.json
    new_score = Score(
        player_name=data['player_name'],
        score=data['score']
    )
    db.session.add(new_score)
    db.session.commit()
    return jsonify({'message': 'Score saved successfully'})

@app.route('/api/highscores')
def get_highscores():
    scores = Score.query.order_by(Score.score.desc()).limit(10).all()
    return jsonify([{
        'player_name': score.player_name,
        'score': score.score,
        'date': score.date.strftime('%Y-%m-%d %H:%M:%S')
    } for score in scores])

if __name__ == '__main__':
    app.run(debug=True)
